#!/usr/bin/env node
/**
 * n8n Workflow Builder
 *
 * Creates step handler JSON files and updates Process Step routing.
 * All handlers share the same n8n instance — constants like instanceId
 * and errorWorkflow ID are project-specific and live here.
 *
 * Usage:
 *   node n8n-workflows/scripts/n8n-builder.mjs create-handler [options]
 *   node n8n-workflows/scripts/n8n-builder.mjs add-route [options]
 *   node n8n-workflows/scripts/n8n-builder.mjs --help
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WORKFLOWS_DIR = resolve(__dirname, '../workflows/Workflows')
const PROCESS_STEP_FILE = resolve(WORKFLOWS_DIR, 'Workflow Process Step.json')

// ─── Project-specific constants ───────────────────────────────────────────────
// These are tied to the n8n instance and workspace. Update if instance changes.
const N8N_INSTANCE_ID = 'b46d0b13d69880a2fec430102877b55af4e44991549a68a3e78cd50a4dc1a09e'
const ERROR_WORKFLOW_ID = 'pEvMbZGHKOsqaHmK'

// ─── Shared workflow settings (same for all step handlers) ────────────────────
const HANDLER_SETTINGS = {
  executionOrder: 'v1',
  binaryMode: 'separate',
  timeSavedMode: 'fixed',
  errorWorkflow: ERROR_WORKFLOW_ID,
  callerPolicy: 'workflowsFromSameOwner',
  availableInMCP: false,
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: create-handler
// Creates a simple 2-node evaluator handler: Start → Evaluate X (Code node)
// This is the pattern used by: Condition, Switch, Get Response, Update Response,
// Get Survey Link, Trigger, and any new step type that only needs a Code node.
// ─────────────────────────────────────────────────────────────────────────────

function createEvaluatorHandler({ name, evaluatorName, code, workflowId, outputFile }) {
  const resolvedId = workflowId ?? randomUUID().replace(/-/g, '').slice(0, 16)
  const versionId = randomUUID()
  const startNodeId = randomUUID()
  const evaluatorNodeId = randomUUID()

  const workflow = {
    name,
    pinData: {},
    connections: {
      Start: {
        main: [[{ node: evaluatorName, type: 'main', index: 0 }]],
      },
    },
    active: true,
    settings: HANDLER_SETTINGS,
    versionId,
    meta: { instanceId: N8N_INSTANCE_ID },
    id: resolvedId,
    tags: [],
    nodes: [
      {
        id: startNodeId,
        name: 'Start',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: 1.1,
        position: [0, 0],
        parameters: { inputSource: 'passthrough' },
      },
      {
        id: evaluatorNodeId,
        name: evaluatorName,
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [272, 0],
        parameters: { jsCode: code },
      },
    ],
  }

  const outPath = outputFile ?? resolve(WORKFLOWS_DIR, `${name}.json`)
  writeFileSync(outPath, JSON.stringify(workflow, null, 2) + '\n')
  return { outPath, workflowId: resolvedId }
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: add-route
// Adds a new step type to the "Route by Step Type" Switch node in Process Step,
// and wires up a new "Call X Handler" executeWorkflow node.
// ─────────────────────────────────────────────────────────────────────────────

function addRouteToProcessStep({ stepType, handlerName, handlerWorkflowId }) {
  const processStep = JSON.parse(readFileSync(PROCESS_STEP_FILE, 'utf8'))

  // Find the "Route by Step Type" Switch node
  const routerNode = processStep.nodes.find(n => n.name === 'Route by Step Type')
  if (!routerNode) throw new Error('Could not find "Route by Step Type" node in Process Step')

  const rules = routerNode.parameters.rules.values
  const fallbackIdx = rules.findIndex(r => {
    const conds = r.conditions?.conditions ?? []
    return conds.some(c => c.rightValue === 'true' || !c.rightValue)
  })

  // Check if rule already exists
  const alreadyExists = rules.some(r =>
    r.conditions?.conditions?.some(c => c.rightValue === stepType)
  )
  if (alreadyExists) {
    console.warn(`⚠️  Rule for step type "${stepType}" already exists in Process Step`)
    return null
  }

  // Build the new rule (same structure as existing rules)
  const newRuleId = randomUUID().slice(0, 8)
  const newRule = {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
      conditions: [{
        leftValue: '={{ $json.stepType }}',
        rightValue: stepType,
        operator: { type: 'string', operation: 'equals', singleValue: true },
        id: `sw-cond-${newRuleId}`,
      }],
      combinator: 'and',
    },
    renameOutput: true,
    outputKey: stepType,
  }

  // Insert before fallback (or at end)
  const insertAt = fallbackIdx >= 0 ? fallbackIdx : rules.length
  rules.splice(insertAt, 0, newRule)

  // The new rule's output index = insertAt
  const newOutputIndex = insertAt

  // Add new "Call X Handler" node
  const callerNodeId = randomUUID()
  const callerNodeName = `Call ${handlerName.replace('Step - ', '').replace(' Handler', '')} Handler`
  const callerNode = {
    id: callerNodeId,
    name: callerNodeName,
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.3,
    position: findFreePosition(processStep.nodes),
    parameters: {
      workflowInputs: {
        mappingMode: 'autoMapInputData',
        value: {},
        matchingColumns: [],
        schema: [],
        ignoreFrom: '',
        attemptToConvertTypes: false,
        convertFieldsToString: false,
      },
      source: 'database',
      workflowId: {
        __rl: true,
        value: handlerWorkflowId,
        mode: 'list',
        cachedResultUrl: `/workflow/${handlerWorkflowId}`,
        cachedResultName: handlerName,
      },
    },
  }
  processStep.nodes.push(callerNode)

  // Wire: Route by Step Type[newOutputIndex] → Call X Handler
  const routerConnections = processStep.connections['Route by Step Type']
  if (!routerConnections.main) routerConnections.main = []
  // Extend main array to accommodate new output index
  while (routerConnections.main.length <= newOutputIndex) {
    routerConnections.main.push([])
  }
  // Insert the new connection at the correct output index
  routerConnections.main.splice(newOutputIndex, 0, [
    { node: callerNodeName, type: 'main', index: 0 },
  ])

  // Wire: Call X Handler → Process Step Result
  const processResultNode = processStep.nodes.find(n =>
    n.name.includes('Process Step Result') || n.name.includes('Process Result')
  )
  if (processResultNode) {
    if (!processStep.connections[callerNodeName]) {
      processStep.connections[callerNodeName] = { main: [[]] }
    }
    processStep.connections[callerNodeName].main[0].push({
      node: processResultNode.name,
      type: 'main',
      index: 0,
    })
  }

  writeFileSync(PROCESS_STEP_FILE, JSON.stringify(processStep, null, 2) + '\n')
  return { callerNodeName, newOutputIndex }
}

function findFreePosition(nodes) {
  // Place new node below existing ones (avoid overlap)
  const maxY = Math.max(...nodes.map(n => (n.position?.[1] ?? 0))) + 200
  return [400, maxY]
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      const next = argv[i + 1]
      args[key] = (!next || next.startsWith('--')) ? true : (i++, next)
    }
  }
  return args
}

function printHelp() {
  console.log(`
n8n Workflow Builder
====================

Commands:

  create-handler
    Create a simple evaluator handler (Start → Evaluate X).
    The pattern used by Condition, Switch, Get Response, etc.

    Options:
      --name          Workflow name, e.g. "Step - Foo Handler"     (required)
      --evaluator     Code node name, e.g. "Evaluate Foo"          (required)
      --code          Path to JS file with evaluator code          (required*)
      --code-inline   Inline JS code string                        (required*)
      --id            Workflow ID (default: auto-generated)
      --out           Output file (default: WORKFLOWS_DIR/<name>.json)

    * Provide either --code (file path) or --code-inline (string), not both.

    Example:
      node scripts/n8n-builder.mjs create-handler \\
        --name "Step - Foo Handler" \\
        --evaluator "Evaluate Foo" \\
        --code ./scripts/evaluators/foo-evaluator.js

  add-route
    Add a new step type to Process Step routing.
    Adds the route rule AND the Call X Handler node.

    Options:
      --step-type         Step type key, e.g. "switch"             (required)
      --handler-name      Workflow name of the handler             (required)
      --handler-id        n8n workflow ID of the handler           (required)

    Example:
      node scripts/n8n-builder.mjs add-route \\
        --step-type switch \\
        --handler-name "Step - Switch Handler" \\
        --handler-id Sw1tch4H4ndl3rX9

Typical workflow for a new step type:
  1. Write evaluator JS code in scripts/evaluators/my-step-evaluator.js
  2. Run create-handler to generate the handler JSON
  3. Import the JSON into n8n, note the assigned workflow ID
  4. Run add-route with the real workflow ID
  5. Re-import Process Step into n8n
`)
}

const [,, command, ...rest] = process.argv

if (!command || command === '--help' || command === '-h') {
  printHelp()
  process.exit(0)
}

const args = parseArgs(rest)

if (command === 'create-handler') {
  if (!args.name || !args.evaluator) {
    console.error('Error: --name and --evaluator are required')
    process.exit(1)
  }
  if (!args.code && !args.codeInline) {
    console.error('Error: provide --code (file path) or --code-inline (string)')
    process.exit(1)
  }

  const code = args.codeInline
    ? args.codeInline
    : readFileSync(resolve(process.cwd(), args.code), 'utf8')

  const outPath = args.out ? resolve(process.cwd(), args.out) : null

  const result = createEvaluatorHandler({
    name: args.name,
    evaluatorName: args.evaluator,
    code,
    workflowId: args.id ?? null,
    outputFile: outPath,
  })

  console.log(`✅  Created: ${result.outPath}`)
  console.log(`   Workflow ID: ${result.workflowId}`)
  console.log()
  console.log('Next: import into n8n, then run:')
  console.log(`  node scripts/n8n-builder.mjs add-route \\`)
  console.log(`    --step-type <type> \\`)
  console.log(`    --handler-name "${args.name}" \\`)
  console.log(`    --handler-id <n8n-assigned-id>`)

} else if (command === 'add-route') {
  if (!args.stepType || !args.handlerName || !args.handlerId) {
    console.error('Error: --step-type, --handler-name, and --handler-id are required')
    process.exit(1)
  }

  const result = addRouteToProcessStep({
    stepType: args.stepType,
    handlerName: args.handlerName,
    handlerWorkflowId: args.handlerId,
  })

  if (result) {
    console.log(`✅  Updated: ${PROCESS_STEP_FILE}`)
    console.log(`   Added rule: "${args.stepType}" at output index ${result.newOutputIndex}`)
    console.log(`   Added node: "${result.callerNodeName}"`)
    console.log()
    console.log('Next: re-import Workflow Process Step.json into n8n')
  }

} else {
  console.error(`Unknown command: ${command}`)
  printHelp()
  process.exit(1)
}

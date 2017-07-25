import findUp from 'find-up'
import fs from 'fs'
import glob from 'glob'
import parser from 'solidity-parser-antlr'

const formatter = require('eslint/lib/formatters/codeframe')

const NAME = 'solcheck'

function lint (files, argv) {
  let results = []

  glob(files[0], (err, matches) => {
    for (let filePath of matches) {
      const source = fs.readFileSync(filePath).toString('utf-8')
      const ast = parser.parse(source, { loc: true, range: true })
      const report = processFile(filePath, source, ast)
      results.push(report)
    }

    console.log(formatter(results))
  })
}

function getRules () {
  return [
    {
      ruleId: 'deprecated-suicide',
      rule: require('./rules/deprecated-suicide'),
      severity: 2
    }
  ]
}

function processFile (filePath, source, ast) {
  let messages = []

  let errorCount = 1
  let warningCount = 0

  for (let { ruleId, rule, severity } of getRules()) {
    let context = {
      report(obj) {
          let node = obj.node
          delete obj.node

          const message = Object.assign({
            ruleId,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 2
          }, obj)

          messages.push(message)
      }
    }
    parser.visit(ast, rule.create(context))
  }

  return Object({ errorCount, warningCount, filePath, source, messages })
}

module.exports = function main () {
  const configPath = findUp.sync([`.${NAME}rc`])
  const config = configPath ? JSON.parse(fs.readFileSync(configPath)) : {}

  const argv = require('yargs')
    .usage('Usage: $0 [options] <files>')
    .option('verbose', {
      alias: 'v',
      default: false
    })
    .help()
    .config(config)
    .pkgConf(NAME)
    .argv

  const files = argv._

  lint(files, argv)
}
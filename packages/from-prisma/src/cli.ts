import { Command } from 'commander'
import { exec } from 'child_process'
import { stat, mkdir } from 'node:fs'

import { wrappedWriteSchema, wrappedDumpJSON, migrate } from './converter'


function execCB(
  err: Error | null,
  stdout: string | Buffer,
  stderr: string | Buffer
) {
  if (err) {
    console.error(stderr)
    process.exit(1)
  }
}


const program = new Command();
program
  .name('cli')
  .description('CLI to transfer data from Prisma to EdgeDB')
  .version('0.1.0');

program.command('esdl')
  .description('Generate EdgeDB schema files')
  .option('--esdldir <string>', 'directory for esdl files', 'esdl')
  .action((options) => {
    console.log('Generating EdgeDB schema files...')

    // make sure the target directory exists
    stat(options.esdldir, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          mkdir(options.esdldir, (err) => {
            if (err) {
              console.error(err)
              process.exit(1)
            } else {
              wrappedWriteSchema(options.esdldir)
            }
          })
        } else {
          console.error(err)
          process.exit(1)
        }
      } else if (stats.isDirectory()) {
        wrappedWriteSchema(options.esdldir)
      } else {
        console.error(`'${ options.esdldir }' is not a directory`)
        process.exit(1)
      }
    })
  })

program.command('dump-json')
  .description('Export data from Prisma as JSON')
  .option('--jsondir <string>', 'directory for JSON files', 'dump')
  .action((options) => {
    console.log('Exporting JSON data...')

    // make sure the target directory exists
    stat(options.jsondir, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          mkdir(options.jsondir, (err) => {
            if (err) {
              console.error(err)
              process.exit(1)
            } else {
              wrappedDumpJSON(options.jsondir)
            }
          })
        } else {
          console.error(err)
          process.exit(1)
        }
      } else if (stats.isDirectory()) {
        wrappedDumpJSON(options.jsondir)
      } else {
        console.error(`'${ options.jsondir }' is not a directory`)
        process.exit(1)
      }
    })
  })

program.command('migrate')
  .description('Using the schema and JSON dumps populate the EdgeDB database')
  .option('--esdldir <string>', 'directory for esdl files', 'esdl')
  .option('--jsondir <string>', 'directory for JSON files', 'dump')
  .action((options) => {
    console.log('Importing JSON data into EdgeDB...', options)

    // Assume we're in an EdgeDB project already, so we don't need to do
    // initialize one. However, we still need to clean up 'dbschema' and wipe
    // the database.
    exec('edgedb database wipe --non-interactive', execCB)
    exec(`cp ${ options.esdldir }/init.esdl dbschema/default.esdl`, execCB)
    exec('edgedb migration create', execCB)
    exec('edgedb migration apply', execCB)
    // import the data
    migrate(options.jsondir)
      .then(async () => {
        exec(`cp ${ options.esdldir }/final.esdl dbschema/default.esdl`,
             execCB)
        exec('edgedb migration create --non-interactive --allow-unsafe',
             execCB)
        exec('edgedb migration apply --quiet', execCB)
      })
      .catch(async (e) => {
        console.error(e)
        process.exit(1)
      })
  })

program.parse();

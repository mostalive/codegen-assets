import { html as template } from 'common-tags'
import { CodegenTemplateParams } from '../types'

const sampleValues = {
  Int: 1111,
  String: '"<sample value>"',
  Boolean: false,
  Float: 11.11,
  ID: 1111,
}

// Use JSDoc Types for typeDefs args
export const javascriptExpressTemplate = (params: CodegenTemplateParams) => {
  const { actionName, returnType, derive, typeMap } = params

  const returnTypeDef = typeMap.types[returnType]

  const baseTemplate = template`
    function ${actionName}Handler(args) {
      return {
        ${returnTypeDef
          .map((f) => {
            return `${f.getName()}: ${
              sampleValues[f.getTypename()] || sampleValues['String']
            }`
          })
          .join(',\n')},
      }
    }

    // Request Handler
    app.post('/${actionName}', async (req, res) => {
      // get request input
      const params = req.body.input

      // run some business logic
      const result = ${actionName}Handler(params)

      /*
      // In case of errors:
      return res.status(400).json({
        message: "error happened"
      })
      */

      // success
      return res.json(result)
    })
  `

  // This is horrendous, but that chunk in the middle is the only way the GraphQL backtick-quoted multiline string will format properly
  const hasuraOperation = ' `' + derive?.operation + '`\n\n'

  const derivedTemplate =
    template`
    import fetch from 'node-fetch'

    const HASURA_OPERATION =` +
    hasuraOperation +
    template`

    const execute = async (variables) => {
      const fetchResponse = await fetch('http://localhost:8080/v1/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: HASURA_OPERATION,
          variables,
        }),
      })
      const data = await fetchResponse.json()
      console.log('DEBUG: ', data)
      return data
    }

    // Request Handler
    app.post('/${actionName}', async (req, res) => {
      // get request input
      const params = req.body.input
      // execute the parent operation in Hasura
      const { data, errors } = await execute(params)
      if (errors) return res.status(400).json(errors[0])
      // run some business logic

      // success
      return res.json(data)
    })
  `

  if (derive?.operation) return derivedTemplate
  else return baseTemplate
}

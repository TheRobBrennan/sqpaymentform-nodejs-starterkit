/*
  Copyright 2019 Square Inc.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
const express = require('express')
const bodyParser = require('body-parser')
const crypto = require('crypto')
const squareConnect = require('square-connect')

const app = express()
const port = 3000

// Set the Access Token
// TODO: This should be an environment variable, but is included here for sandbox testing purposes only
const accessToken =
  'EAAAECmQSugvHJCComTzdF6WLXDdwx5fTP0xU2Y3EOf_C6v_KipIz1uBbo-oqRJf'

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(__dirname))

// Set Square Connect credentials and environment
const defaultClient = squareConnect.ApiClient.instance

// Configure OAuth2 access token for authorization: oauth2
const oauth2 = defaultClient.authentications['oauth2']
oauth2.accessToken = accessToken

// Set 'basePath' to switch between sandbox env and production env
// sandbox: https://connect.squareupsandbox.com
// production: https://connect.squareup.com
defaultClient.basePath = 'https://connect.squareupsandbox.com'

// Here is where the magic begins. Let's see what happens as we receive the incoming request from the front-end.
app.post('/process-payment', async (req, res) => {
  // We are expecting our request body to have a nonce key/value pair
  const request_params = req.body

  // length of idempotency_key should be less than 45
  const idempotency_key = crypto.randomBytes(22).toString('hex')

  // Above, we defined the defaultClient of squareConnect to use our access token. Let's connect to the Payments API.
  const payments_api = new squareConnect.PaymentsApi()

  // Build our request body using the nonce that we received in the body of the incoming POST
  const request_body = {
    source_id: request_params.nonce,
    amount_money: {
      amount: 100, // $1.00 charge
      currency: 'USD'
    },
    idempotency_key: idempotency_key
  }

  // Attempt to charge the customer's card
  try {
    // Square Payments API documentation available at https://developer.squareup.com/docs/payments-api/overview
    const response = await payments_api.createPayment(request_body)

    // Success! We have charged the card and can share the result with our front-end.
    res.status(200).json({
      title: 'Payment Successful',
      result: response
    })
  } catch (error) {
    // Aw damn. Something bad happened here. The card will not be charged.
    res.status(500).json({
      title: 'Payment Failure',
      result: error.response.text
    })
  }
})

app.listen(port, () => console.log(`listening on - http://localhost:${port}`))

/**
 * @openapi
 * '/api/v2/payments/deposit':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Deposit crypto funds
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/DepositRequest'
 *     responses:
 *      200:
 *        description: Deposit address generated
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/m-deposit':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Deposit via Metamask (Ethereum)
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/MetamaskDepositRequest'
 *     responses:
 *      200:
 *        description: Deposit processed
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/s-deposit':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Deposit via Solana
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/SolanaDepositRequest'
 *     responses:
 *      200:
 *        description: Deposit processed
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/withdrawal':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Withdraw funds
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/WithdrawalRequest'
 *     responses:
 *      200:
 *        description: Withdrawal processed
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/c-withdrawal':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Cancel withdrawal
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/CancelWithdrawalRequest'
 *     responses:
 *      200:
 *        description: Withdrawal cancelled
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/use-currency':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Set active currency for user
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/CurrencyRequest'
 *     responses:
 *      200:
 *        description: Currency set
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/get-currency':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Get available crypto currencies
 *     responses:
 *      200:
 *        description: List of currencies
 *      401:
 *        description: Unauthorized
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/get-address':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Get deposit address for a currency
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/GenerateAddressRequest'
 *     responses:
 *      200:
 *        description: Address returned
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/generate-address':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Generate a new deposit address
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/GenerateAddressRequest'
 *     responses:
 *      200:
 *        description: Address generated
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/add-currency':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Add or remove a currency for user
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/CurrencyRequest'
 *     responses:
 *      200:
 *        description: Currency updated
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/get-balance':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Get user balances
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/UserIdRequest'
 *     responses:
 *      200:
 *        description: Balances returned
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/get-transaction':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Get user transactions
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/UserIdRequest'
 *     responses:
 *      200:
 *        description: Transactions returned
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/deposit-now':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Deposit via NowPay
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/DepositNowRequest'
 *     responses:
 *      200:
 *        description: Deposit created
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/exchange-now':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Exchange via NowPay
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/ExchangeNowRequest'
 *     responses:
 *      200:
 *        description: Exchange created
 *      400:
 *        description: Invalid field
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/fiat-now':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Get NowPay fiat options
 *     responses:
 *      200:
 *        description: Fiat options returned
 *      401:
 *        description: Unauthorized
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/get-currency-fiat':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Get available fiat currencies
 *     responses:
 *      200:
 *        description: List of fiat currencies
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/deposit-fiat-quikly':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Deposit via QuiklyPay
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/DepositFiatQuiklyRequest'
 *     responses:
 *      200:
 *        description: Deposit created
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/success-quikly':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: QuiklyPay success callback
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/QuiklyCallbackRequest'
 *     responses:
 *      200:
 *        description: Success
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/cancel-quikly':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: QuiklyPay cancel callback
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/QuiklyCallbackRequest'
 *     responses:
 *      200:
 *        description: Cancelled
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/callback-quikly':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: QuiklyPay webhook callback
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/QuiklyCallbackRequest'
 *     responses:
 *      200:
 *        description: Callback received
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/status-quikly':
 *  get:
 *     tags:
 *     - Payments Controller
 *     summary: Check QuiklyPay payment status
 *     parameters:
 *      - in: query
 *        name: order_id
 *        schema:
 *          type: string
 *        required: true
 *        description: Order ID
 *     responses:
 *      200:
 *        description: Status returned
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/create-omno-tx':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Create Omno transaction
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/CreateOmnoTxRequest'
 *     responses:
 *      200:
 *        description: Transaction created
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/submit-crypto':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Submit crypto payment
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/SubmitCryptoRequest'
 *     responses:
 *      200:
 *        description: Payment submitted
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/calc-usdt-crypto':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Calculate USDT to crypto value
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/SubmitCryptoRequest'
 *     responses:
 *      200:
 *        description: Calculation result
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/get-active-payment':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Get active crypto payment methods
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/ActiveCryptoRequest'
 *     responses:
 *      200:
 *        description: Active payment methods
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/omno-hook':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Omno webhook callback
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *     responses:
 *      200:
 *        description: Callback received
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/trio-session-create':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Create Trio payment session
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/CreateTrioSessionRequest'
 *     responses:
 *      200:
 *        description: Session created
 *      500:
 *        description: Server error
 */
/**
 * @openapi
 * '/api/v2/payments/status-trio':
 *  post:
 *     tags:
 *     - Payments Controller
 *     summary: Check Trio payment status
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            $ref: '#/components/schemas/TrioStatusRequest'
 *     responses:
 *      200:
 *        description: Status returned
 *      500:
 *        description: Server error
 */

// --- SCHEMAS ---
/**
 * @openapi
 * components:
 *   schemas:
 *     DepositRequest:
 *       type: object
 *       required:
 *         - userId
 *         - balanceId
 *         - currencyId
 *       properties:
 *         userId:
 *           type: string
 *         balanceId:
 *           type: string
 *         currencyId:
 *           type: string
 *     MetamaskDepositRequest:
 *       type: object
 *       required:
 *         - userId
 *         - balanceId
 *         - currencyId
 *         - txn_id
 *         - amounti
 *         - address
 *         - from
 *       properties:
 *         userId:
 *           type: string
 *         balanceId:
 *           type: string
 *         currencyId:
 *           type: string
 *         txn_id:
 *           type: string
 *         amounti:
 *           type: number
 *         address:
 *           type: string
 *         from:
 *           type: string
 *     SolanaDepositRequest:
 *       type: object
 *       required:
 *         - userId
 *         - balanceId
 *         - currencyId
 *         - txn_id
 *         - amounti
 *         - address
 *         - from
 *       properties:
 *         userId:
 *           type: string
 *         balanceId:
 *           type: string
 *         currencyId:
 *           type: string
 *         txn_id:
 *           type: string
 *         amounti:
 *           type: number
 *         address:
 *           type: string
 *         from:
 *           type: string
 *     WithdrawalRequest:
 *       type: object
 *       required:
 *         - userId
 *         - balanceId
 *         - currencyId
 *         - amount
 *         - address
 *       properties:
 *         userId:
 *           type: string
 *         balanceId:
 *           type: string
 *         currencyId:
 *           type: string
 *         amount:
 *           type: number
 *         address:
 *           type: string
 *     CancelWithdrawalRequest:
 *       type: object
 *       required:
 *         - userId
 *         - withdrawalId
 *       properties:
 *         userId:
 *           type: string
 *         withdrawalId:
 *           type: string
 *     CurrencyRequest:
 *       type: object
 *       required:
 *         - userId
 *         - currencyId
 *       properties:
 *         userId:
 *           type: string
 *         currencyId:
 *           type: string
 *     GenerateAddressRequest:
 *       type: object
 *       required:
 *         - userId
 *         - currencyId
 *       properties:
 *         userId:
 *           type: string
 *         currencyId:
 *           type: string
 *     UserIdRequest:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         userId:
 *           type: string
 *     DepositNowRequest:
 *       type: object
 *       required:
 *         - userId
 *         - amount
 *         - currency
 *       properties:
 *         userId:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *     ExchangeNowRequest:
 *       type: object
 *       required:
 *         - userId
 *         - fromCurrency
 *         - toCurrency
 *         - amount
 *       properties:
 *         userId:
 *           type: string
 *         fromCurrency:
 *           type: string
 *         toCurrency:
 *           type: string
 *         amount:
 *           type: number
 *     DepositFiatQuiklyRequest:
 *       type: object
 *       required:
 *         - customer_name
 *         - customer_email
 *         - currency_code
 *         - amount
 *       properties:
 *         customer_name:
 *           type: string
 *         customer_email:
 *           type: string
 *         currency_code:
 *           type: string
 *         amount:
 *           type: number
 *     QuiklyCallbackRequest:
 *       type: object
 *       required:
 *         - order_id
 *         - currency_symbol
 *         - quantity
 *       properties:
 *         order_id:
 *           type: string
 *         currency_symbol:
 *           type: string
 *         quantity:
 *           type: number
 *     CreateOmnoTxRequest:
 *       type: object
 *       required:
 *         - userId
 *         - amount
 *         - currency
 *       properties:
 *         userId:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *     SubmitCryptoRequest:
 *       type: object
 *       required:
 *         - userId
 *         - amount
 *         - currency
 *         - address
 *       properties:
 *         userId:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         address:
 *           type: string
 *     ActiveCryptoRequest:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         userId:
 *           type: string
 *     CreateTrioSessionRequest:
 *       type: object
 *       required:
 *         - amount
 *         - user
 *       properties:
 *         amount:
 *           type: number
 *         user:
 *           type: object
 *     TrioStatusRequest:
 *       type: object
 *       required:
 *         - data
 *       properties:
 *         data:
 *           type: object
 */

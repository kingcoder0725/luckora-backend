/**
 * @openapi
 * '/api/v2/user/signin':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Authenticate a user
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - username
 *              - password
 *            properties:
 *              username:
 *                type: string
 *                default: johndoe
 *              password:
 *                type: string
 *                default: johnDoe20!@
 *     responses:
 *      200:
 *        description: Authenticated
 *      401:
 *        description: Unauthorized
 *      500:
 *        description: Server Error
 */
/** POST Methods */
/**
 * @openapi
 * '/api/v2/user/signup':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Create a user
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - surname
 *              - middlename
 *              - username
 *              - email
 *              - phone
 *              - country_reg
 *              - address
 *              - birthday
 *              - gender
 *              - currency
 *              - password
 *            properties:
 *              surname:
 *                type: string
 *                default: Doe
 *              middlename:
 *                type: string
 *                default: John
 *              username:
 *                type: string
 *                default: johndoe
 *              email:
 *                type: string
 *                default: johndoe@mail.com
 *              phone:
 *                type: string
 *                default: '+1234567890'
 *              country_reg:
 *                type: string
 *                default: 'US'
 *              address:
 *                type: string
 *                default: '123 Main St'
 *              birthday:
 *                type: number
 *                default: 946684800000
 *              gender:
 *                type: string
 *                enum: [Male, Female]
 *                default: Male
 *              currency:
 *                type: string
 *                default: 'USD'
 *              password:
 *                type: string
 *                default: johnDoe20!@
 *              referral:
 *                type: string
 *                default: ''
 *              rReferral:
 *                type: string
 *                default: ''
 *              clickid:
 *                type: string
 *                default: ''
 *     responses:
 *      201:
 *        description: Created
 *      409:
 *        description: Conflict
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/user/send-email':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Verify a user
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - username
 *            properties:
 *              username:
 *                type: string
 *                default: johndoe
 *     responses:
 *      201:
 *        description: Created
 *      409:
 *        description: Conflict
 *      404:
 *        description: Not Found
 *      500:
 *        desccription: Server Error
 */
/**
 * @openapi
 * '/api/v2/user/verify-password':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Verify the user's password
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - userId
 *              - password
 *            properties:
 *              userId:
 *                type: string
 *                default: 'user_id'
 *              password:
 *                type: string
 *                default: johnDoe20!@
 *     responses:
 *      200:
 *        description: Password verified
 *      400:
 *        description: Invalid password
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/user/forgot':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Send a password reset link or code to the user
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - username
 *            properties:
 *              username:
 *                type: string
 *                default: johndoe
 *     responses:
 *      200:
 *        description: Reset link/code sent
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */



/**
 * @openapi
 * '/api/v2/user/signout':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Sign out the user
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - userId
 *            properties:
 *              userId:
 *                type: string
 *                default: 'user_id'
 *     responses:
 *      200:
 *        description: Signed out
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/r-password':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Reset the user's password
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - username
 *              - code
 *              - newPassword
 *            properties:
 *              username:
 *                type: string
 *                default: johndoe
 *              code:
 *                type: string
 *                default: '123456'
 *              newPassword:
 *                type: string
 *                default: johnDoe20!@
 *     responses:
 *      200:
 *        description: Password reset
 *      400:
 *        description: Invalid code
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/c-password':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Change the user's password
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - userId
 *              - oldPassword
 *              - newPassword
 *            properties:
 *              userId:
 *                type: string
 *                default: 'user_id'
 *              oldPassword:
 *                type: string
 *                default: johnDoe20!@
 *              newPassword:
 *                type: string
 *                default: johnDoe21!@
 *     responses:
 *      200:
 *        description: Password changed
 *      400:
 *        description: Invalid password
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/me':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Get the current user's profile
 *     security:
 *      - bearerAuth: []
 *     responses:
 *      200:
 *        description: User profile
 *      401:
 *        description: Unauthorized
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/verify-kyc':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Submit KYC verification data
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - userId
 *              - kycData
 *            properties:
 *              userId:
 *                type: string
 *                default: 'user_id'
 *              kycData:
 *                type: object
 *                default: {}
 *     responses:
 *      200:
 *        description: KYC submitted
 *      400:
 *        description: Invalid data
 *      401:
 *        description: Unauthorized
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/verify-token':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Verify a user's token
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - token
 *            properties:
 *              token:
 *                type: string
 *                default: 'jwt_token'
 *     responses:
 *      200:
 *        description: Token verified
 *      400:
 *        description: Invalid token
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/verify-kyc-mobile':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Submit KYC verification data from mobile
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - userId
 *              - kycData
 *            properties:
 *              userId:
 *                type: string
 *                default: 'user_id'
 *              kycData:
 *                type: object
 *                default: {}
 *     responses:
 *      200:
 *        description: KYC submitted
 *      400:
 *        description: Invalid data
 *      401:
 *        description: Unauthorized
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/info':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Get detailed user information
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - userId
 *            properties:
 *              userId:
 *                type: string
 *                default: 'user_id'
 *     responses:
 *      200:
 *        description: User info
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/referral':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Get the user's referral information
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - userId
 *            properties:
 *              userId:
 *                type: string
 *                default: 'user_id'
 *     responses:
 *      200:
 *        description: Referral info
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/check-responce':
 *  get:
 *     tags:
 *     - User Controller
 *     summary: Check API response status
 *     responses:
 *      200:
 *        description: Status OK
 */

/**
 * @openapi
 * '/api/v2/user/track_time_spent':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Track the time spent by the user
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - timeSpent
 *            properties:
 *              timeSpent:
 *                type: number
 *                default: 120
 *     responses:
 *      200:
 *        description: Time tracked
 *      401:
 *        description: Unauthorized
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/track_current_page':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Track the current page the user is on
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - page
 *            properties:
 *              page:
 *                type: string
 *                default: '/dashboard'
 *     responses:
 *      200:
 *        description: Page tracked
 *      401:
 *        description: Unauthorized
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/get-user':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Get user information from a token
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - token
 *            properties:
 *              token:
 *                type: string
 *                default: 'jwt_token'
 *     responses:
 *      200:
 *        description: User info
 *      400:
 *        description: Invalid token
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/update-user-balance':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Update the user's balance
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - userId
 *              - amount
 *            properties:
 *              userId:
 *                type: string
 *                default: 'user_id'
 *              amount:
 *                type: number
 *                default: 100
 *     responses:
 *      200:
 *        description: Balance updated
 *      400:
 *        description: Invalid data
 *      500:
 *        description: Server Error
 */

/**
 * @openapi
 * '/api/v2/user/get-sumsub-access-token':
 *  post:
 *     tags:
 *     - User Controller
 *     summary: Get a Sumsub access token for KYC
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - token
 *            properties:
 *              token:
 *                type: string
 *                default: 'jwt_token'
 *     responses:
 *      200:
 *        description: Access token
 *      400:
 *        description: Invalid token
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/games/list':
 *  post:
 *     tags:
 *     - Games Controller
 *     summary: Get the list of available games
 *     responses:
 *      200:
 *        description: List of games
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/games/provders':
 *  post:
 *     tags:
 *     - Games Controller
 *     summary: Get the list of game providers
 *     responses:
 *      200:
 *        description: List of providers
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/games/top_games':
 *  get:
 *     tags:
 *     - Games Controller
 *     summary: Get the list of top games
 *     responses:
 *      200:
 *        description: List of top games
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/games/fast_games':
 *  get:
 *     tags:
 *     - Games Controller
 *     summary: Get the list of fast games
 *     responses:
 *      200:
 *        description: List of fast games
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/games/demo-play':
 *  post:
 *     tags:
 *     - Games Controller
 *     summary: Get demo URL for a game
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - game_code
 *            properties:
 *              game_code:
 *                type: string
 *                default: 'keno_01'
 *     responses:
 *      200:
 *        description: Demo URL
 *      400:
 *        description: Invalid request
 *      402:
 *        description: Game Link is invalid or Demo mode is not allowed
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/games/play':
 *  post:
 *     tags:
 *     - Games Controller
 *     summary: Launch a game
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - provider_code
 *              - game_code
 *              - fun_mode
 *              - currency
 *            properties:
 *              provider_code:
 *                type: string
 *                default: 'timelesstech'
 *              game_code:
 *                type: string
 *                default: 'keno_01'
 *              fun_mode:
 *                type: boolean
 *                default: false
 *              currency:
 *                type: string
 *                default: 'USD'
 *     responses:
 *      200:
 *        description: Game URL
 *      400:
 *        description: Invalid request or Game API undefined
 *      402:
 *        description: Game Link is invalid or Demo mode is not allowed
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/games/game':
 *  post:
 *     tags:
 *     - Games Controller
 *     summary: Get game details
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - game_code
 *            properties:
 *              game_code:
 *                type: string
 *                default: 'keno_01'
 *     responses:
 *      200:
 *        description: Game details
 *      400:
 *        description: Invalid request
 *      402:
 *        description: Game Id is invalid
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/games/turn':
 *  post:
 *     tags:
 *     - Games Controller
 *     summary: Make a turn in a game
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - gameId
 *            properties:
 *              gameId:
 *                type: string
 *                default: 'keno_01'
 *              # Additional properties depending on the game type
 *     responses:
 *      200:
 *        description: Turn result
 *      400:
 *        description: Game is temporarily unavailable
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/games/myhistory':
 *  post:
 *     tags:
 *     - Games Controller
 *     summary: Get the current user's game history
 *     security:
 *      - bearerAuth: []
 *     responses:
 *      200:
 *        description: User's game history
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/games/history':
 *  post:
 *     tags:
 *     - Games Controller
 *     summary: Get game history
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            properties:
 *              perPage:
 *                type: number
 *                default: 10
 *              type:
 *                type: number
 *                default: 1
 *              userId:
 *                type: string
 *                default: ''
 *     responses:
 *      200:
 *        description: Game history
 *      500:
 *        description: Server Error
 */ 
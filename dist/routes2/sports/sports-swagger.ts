/**
 * @openapi
 * '/api/v2/sports/markets':
 *  post:
 *     tags:
 *     - Sports Controller
 *     summary: Get available sports markets
 *     responses:
 *      200:
 *        description: List of sports markets
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/sports/bet-history':
 *  post:
 *     tags:
 *     - Sports Controller
 *     summary: Get bet details by betsId
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - betsId
 *            properties:
 *              betsId:
 *                type: string
 *                minLength: 32
 *                maxLength: 32
 *                example: '1234567890abcdef1234567890abcdef'
 *     responses:
 *      200:
 *        description: Bet details
 *      400:
 *        description: Invalid betsId
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/sports/bet':
 *  post:
 *     tags:
 *     - Sports Controller
 *     summary: Place a sports bet (single or multi)
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - type
 *              - userId
 *              - currency
 *              - stake
 *              - data
 *            properties:
 *              type:
 *                type: string
 *                enum: [multi, single]
 *                example: single
 *              userId:
 *                type: string
 *                minLength: 24
 *                maxLength: 24
 *                example: '60d0fe4f5311236168a109ca'
 *              currency:
 *                type: string
 *                minLength: 24
 *                maxLength: 24
 *                example: '60d0fe4f5311236168a109cb'
 *              stake:
 *                type: number
 *                example: 100
 *              data:
 *                type: object
 *                description: Bet data (structure depends on bet type)
 *     responses:
 *      200:
 *        description: Bet placed
 *      400:
 *        description: Bet rejected or insufficient balance
 *      403:
 *        description: Bet limited
 *      402:
 *        description: Max bet limit reached or insufficient balance
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/sports/history':
 *  post:
 *     tags:
 *     - Sports Controller
 *     summary: Get user's betting history
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - userId
 *              - status
 *            properties:
 *              userId:
 *                type: string
 *                minLength: 24
 *                maxLength: 24
 *                example: '60d0fe4f5311236168a109ca'
 *              status:
 *                type: string
 *                enum: [Active, Settled]
 *                example: Active
 *     responses:
 *      200:
 *        description: Betting history
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/sports/cashout':
 *  post:
 *     tags:
 *     - Sports Controller
 *     summary: Cash out a sports bet
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - betId
 *            properties:
 *              betId:
 *                type: string
 *                minLength: 24
 *                maxLength: 24
 *                example: '60d0fe4f5311236168a109ca'
 *     responses:
 *      200:
 *        description: Cash out result
 *      400:
 *        description: Not found betId
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/sports/events':
 *  post:
 *     tags:
 *     - Sports Controller
 *     summary: Get event details by eventId
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - eventId
 *            properties:
 *              eventId:
 *                type: number
 *                example: 123456
 *     responses:
 *      200:
 *        description: Event details
 *      402:
 *        description: Event not found or internal error
 *      500:
 *        description: Server Error
 */ 
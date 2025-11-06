/**
 * @openapi
 * '/api/v2/bonus/common/get':
 *  post:
 *     tags:
 *     - Bonus Controller
 *     summary: Get available bonuses for a user
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            properties:
 *              userId:
 *                type: string
 *                description: Optional user ID to filter bonuses
 *     responses:
 *      200:
 *        description: List of available bonuses
 *      402:
 *        description: User not found
 *      500:
 *        description: Internal server error
 */
/**
 * @openapi
 * '/api/v2/bonus/common/active':
 *  post:
 *     tags:
 *     - Bonus Controller
 *     summary: Activate a bonus for the user
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - notificationId
 *              - bonusId
 *              - password
 *            properties:
 *              notificationId:
 *                type: string
 *                minLength: 24
 *                maxLength: 24
 *              bonusId:
 *                type: string
 *                minLength: 24
 *                maxLength: 24
 *              password:
 *                type: string
 *     responses:
 *      200:
 *        description: Bonus activated
 *      402:
 *        description: Error activating bonus (various reasons)
 *      500:
 *        description: Internal server error
 */
/**
 * @openapi
 * '/api/v2/bonus/common/cancel':
 *  post:
 *     tags:
 *     - Bonus Controller
 *     summary: Cancel the user's active bonus
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - password
 *            properties:
 *              password:
 *                type: string
 *     responses:
 *      200:
 *        description: Bonus canceled
 *      402:
 *        description: Passwords do not match or user not found
 *      500:
 *        description: Internal server error
 */
/**
 * @openapi
 * '/api/v2/bonus/common/{id}':
 *  post:
 *     tags:
 *     - Bonus Controller
 *     summary: Get a specific bonus by ID
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: string
 *        required: true
 *        description: Bonus ID
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            properties:
 *              userId:
 *                type: string
 *                description: Optional user ID to check eligibility
 *     responses:
 *      200:
 *        description: Bonus details
 *      402:
 *        description: User or segmentation not found
 *      500:
 *        description: Internal server error
 */ 
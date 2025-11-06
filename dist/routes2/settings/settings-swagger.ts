/**
 * @openapi
 * '/api/v2/settings/notifications/get':
 *  post:
 *     tags:
 *     - Settings Notification
 *     summary: Get notifications for the authenticated user
 *     security:
 *      - bearerAuth: []
 *     responses:
 *      200:
 *        description: List of notifications
 *      400:
 *        description: Internal Server Error
 */
/**
 * @openapi
 * '/api/v2/settings/notifications/read':
 *  post:
 *     tags:
 *     - Settings Notification
 *     summary: Mark notifications as read for the authenticated user
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            properties:
 *              id:
 *                type: string
 *                description: Notification ID (optional)
 *     responses:
 *      200:
 *        description: Success
 *      400:
 *        description: Internal Server Error
 */
/**
 * @openapi
 * '/api/v2/settings/banners/get':
 *  post:
 *     tags:
 *     - Settings Banners
 *     summary: Get banners for the current country or all
 *     responses:
 *      200:
 *        description: List of banners
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/settings/blogs/get':
 *  post:
 *     tags:
 *     - Settings Blogs
 *     summary: Get blogs
 *     responses:
 *      200:
 *        description: List of blogs
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/settings/spinwheel/get':
 *  post:
 *     tags:
 *     - Settings Spinwheel
 *     summary: Get spinwheel options
 *     responses:
 *      200:
 *        description: List of spinwheel options
 *      400:
 *        description: Internal Server Error
 */
/**
 * @openapi
 * '/api/v2/settings/spinwheel/play':
 *  post:
 *     tags:
 *     - Settings Spinwheel
 *     summary: Play the spinwheel (requires authentication)
 *     security:
 *      - bearerAuth: []
 *     responses:
 *      200:
 *        description: Spin result
 *      402:
 *        description: User not found or not eligible
 *      400:
 *        description: Internal Server Error
 */
/**
 * @openapi
 * '/api/v2/settings/dailywheel/get-daily':
 *  get:
 *     tags:
 *     - Settings Dailywheel
 *     summary: Get daily wheel prizes and last bonus info
 *     responses:
 *      200:
 *        description: Daily wheel info
 *      400:
 *        description: Internal Server Error
 */
/**
 * @openapi
 * '/api/v2/settings/dailywheel/play-daily':
 *  post:
 *     tags:
 *     - Settings Dailywheel
 *     summary: Play the daily wheel (requires authentication)
 *     security:
 *      - bearerAuth: []
 *     responses:
 *      200:
 *        description: Play result
 *      401:
 *        description: User not found
 *      403:
 *        description: Not eligible yet
 *      404:
 *        description: Balance not found
 *      500:
 *        description: Server Error
 */ 
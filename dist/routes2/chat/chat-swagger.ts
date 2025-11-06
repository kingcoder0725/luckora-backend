/**
 * @openapi
 * '/api/v2/chat/messages':
 *  post:
 *     tags:
 *     - Chat Controller
 *     summary: Get chat messages (optionally translated)
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            properties:
 *              date:
 *                type: string
 *                description: Optional date filter
 *                default: ''
 *              lang:
 *                type: string
 *                description: Language code for translation (e.g., 'EN')
 *                default: ''
 *     responses:
 *      200:
 *        description: List of chat messages
 *      500:
 *        description: Error fetching messages
 */
/**
 * @openapi
 * '/api/v2/chat/supports':
 *  post:
 *     tags:
 *     - Chat Controller
 *     summary: Get support chat messages for the authenticated user
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            properties:
 *              date:
 *                type: string
 *                description: Optional date filter
 *                default: ''
 *              lang:
 *                type: string
 *                description: Language code for translation (e.g., 'EN')
 *                default: ''
 *     responses:
 *      200:
 *        description: List of support chat messages
 *      500:
 *        description: Error fetching messages
 */
/**
 * @openapi
 * '/api/v2/chat/unread-supports':
 *  post:
 *     tags:
 *     - Chat Controller
 *     summary: Get the count of unread support messages for the authenticated user
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            properties:
 *              date:
 *                type: string
 *                description: Optional date filter
 *                default: ''
 *              lang:
 *                type: string
 *                description: Language code for translation (e.g., 'EN')
 *                default: ''
 *     responses:
 *      200:
 *        description: Count of unread support messages
 *      500:
 *        description: Error fetching messages
 */ 
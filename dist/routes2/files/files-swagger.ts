/**
 * @openapi
 * '/api/v2/files':
 *  post:
 *     tags:
 *     - Files Controller
 *     summary: Upload one or more files
 *     requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *           schema:
 *            type: object
 *            properties:
 *              files:
 *                type: array
 *                items:
 *                  type: string
 *                  format: binary
 *     responses:
 *      200:
 *        description: Uploaded file(s) info
 *      400:
 *        description: No files uploaded
 *      500:
 *        description: Server Error
 */
/**
 * @openapi
 * '/api/v2/files/delete':
 *  post:
 *     tags:
 *     - Files Controller
 *     summary: Delete a file by URI
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            properties:
 *              uri:
 *                type: string
 *                description: URI of the file to delete
 *     responses:
 *      200:
 *        description: Deleted file info
 *      500:
 *        description: Server Error
 */ 
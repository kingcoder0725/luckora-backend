"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.sendMail = void 0;
const sgMail = require("@sendgrid/mail");
const client = require("@sendgrid/client");
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
client.setApiKey(SENDGRID_API_KEY);
client.setDefaultRequest('baseUrl', 'https://tls12.api.sendgrid.com');
sgMail.setClient(client);
const sendMail = ({ to, from, subject, templateId = '', html = '', dynamicTemplateData = null }) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // If we have multiple recipients, handle them in chunks of 1000
        if (typeof to === 'object' && to.length > 1) {
            const chunkSize = 1000;
            const results = [];
            // Split recipients into chunks of 1000
            for (let i = 0; i < to.length; i += chunkSize) {
                const chunk = to.slice(i, i + chunkSize);
                const msg = Object.assign(Object.assign({ from,
                    subject,
                    templateId }, (html && { html })), { personalizations: chunk.map((email) => ({ to: { email } })) });
                if (templateId && dynamicTemplateData) {
                    msg.dynamicTemplateData = dynamicTemplateData;
                }
                const result = yield sgMail.send(msg);
                results.push(result);
                console.log(`Sent email to ${chunk.length} recipients (chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(to.length / chunkSize)})`);
            }
            console.log(templateId, `Total recipients: ${to.length}`, '===>sendmail');
            return results;
        }
        else {
            // Single recipient or single email in array
            const msg = Object.assign({ to,
                from,
                subject,
                templateId }, (html && { html }));
            if (templateId && dynamicTemplateData) {
                msg.dynamicTemplateData = dynamicTemplateData;
            }
            const result = yield sgMail.send(msg);
            console.log(templateId, JSON.stringify(to), '===>sendmail');
            return result;
        }
    }
    catch (err) {
        console.error('Failed sending email error : ', ((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.body) || err);
        return false;
    }
});
exports.sendMail = sendMail;
const validate = (email) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const data = {
            source: 'Validate',
            email,
        };
        const request = {
            url: `/v3/validations/email`,
            method: 'POST',
            body: data,
        };
        // @ts-ignore
        const result = yield client.request(request);
        return result;
    }
    catch (err) {
        console.error('Falid validate email error : ', ((_b = err === null || err === void 0 ? void 0 : err.response) === null || _b === void 0 ? void 0 : _b.body) || err);
        return false;
    }
});
exports.validate = validate;

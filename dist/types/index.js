"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OddsBet365Keys = exports.ApiResponse = void 0;
class ApiResponse {
    constructor() {
        this.success = 0;
        this.pager = {
            page: 0,
            per_page: 0,
            total: 0
        };
    }
}
exports.ApiResponse = ApiResponse;
exports.OddsBet365Keys = ['half_props', 'main', 'main_props', 'others', 'player_props', 'quarter_props', 'schedule', 'team_props'];

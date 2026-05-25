"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryAction = exports.Direction = void 0;
var Direction;
(function (Direction) {
    Direction["FORWARD"] = "forward";
    Direction["BACKWARD"] = "backward";
})(Direction || (exports.Direction = Direction = {}));
var HistoryAction;
(function (HistoryAction) {
    HistoryAction["PUSH"] = "PUSH";
    HistoryAction["POP"] = "POP";
    HistoryAction["REPLACE"] = "REPLACE";
})(HistoryAction || (exports.HistoryAction = HistoryAction = {}));

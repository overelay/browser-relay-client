﻿import connection = require("./connection");
import event = require("./event");
export interface API extends connection.API {
    onOpen: event.Event<Event>;
    onError: event.Event<ErrorEvent>;
    onClose: event.Event<CloseEvent>;
}
export declare class WebSocketConnection extends connection.Connection {
    private webSocket;
    public onOpen: event.Event<Event>;
    public onError: event.Event<ErrorEvent>;
    public onClose: event.Event<CloseEvent>;
    constructor(address: string, webSocket: WebSocket);
    public writeMessageData(data: string): void;
    public getApi(): API;
    static create(address: string, options?: {
        PROTOCOL_NAME?: string;
    }): API;
}
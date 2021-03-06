﻿import connection = require("./connection");
import protocol = require("./protocol");
import event = require("./event");

export interface WebSocketConnectionAPI extends connection.ConnectionAPI {
    onOpen: event.Event<Event>;
    onError: event.Event<ErrorEvent>;
    onClose: event.Event<CloseEvent>;
}

export class WebSocketConnection extends connection.Connection {

    private _address: string;
    private _webSocket: WebSocket;

    public onOpen: event.Event<Event> = new event.Event<Event>();
    public onError: event.Event<ErrorEvent> = new event.Event<ErrorEvent>();
    public onClose: event.Event<CloseEvent> = new event.Event<CloseEvent>();

    public getEndpoint(): string {
        return this._address;
    }

    constructor(address: string, webSocket: WebSocket) {
        super();

        this._address = address;
        this.setTransport(this);

        this._webSocket = webSocket;

        this._webSocket.onmessage = (event) => {
            this.readMessageData(event.data);
        };

        this._webSocket.onopen = (event) => {
            this.onOpen.emit(event);
        };

        this._webSocket.onerror = (event) => {
            this.onError.emit(event);
        };

        this._webSocket.onclose = (event) => {
            this.onClose.emit(event);
        };
    }

    public writeMessageData(data: string) {
        this._webSocket.send(data);
    }

    public getApi(): WebSocketConnectionAPI {
        var api = <WebSocketConnectionAPI>super.getApi();
        api.onOpen = this.onOpen;
        api.onError = this.onError;
        api.onClose = this.onClose;
        api.close = this.close.bind(this);
        return api;
    }

    public close(): void {
        this._webSocket.close();
    }

    static create(address: string, options: {
        PROTOCOL_NAME?: string;
        ws?: typeof WebSocket;
    } = {}): WebSocketConnectionAPI {
        var PROTOCOL_NAME = options.PROTOCOL_NAME || protocol.PROTOCOL_NAME;
        var webSocket = new options.ws(address, PROTOCOL_NAME);
        var connection = new WebSocketConnection(address, webSocket);
        return connection.getApi();
    }
}

export function create(address: string, options: {
    PROTOCOL_NAME?: string;
} = {}): WebSocketConnectionAPI {
    if (global.navigator) {
        (<any>options).ws = WebSocket;
    } else {
        (<any>options).ws = require('websocket').w3cwebsocket;
    }
    return WebSocketConnection.create(address, options);
}
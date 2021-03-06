﻿import connection = require("./connection");
import event = require("./event");
import connectionManager = require("./connection-manager");
import wsConn = require("./websocket-connection");
import routing = require("./routing");
import protocol = require("./protocol");

export interface ConnectionManager extends connectionManager.ConnectionManager<connection.ConnectionAPI> {
}

export interface HubAPI {
    guid: string;
    connect(address: string): wsConn.WebSocketConnectionAPI;
    disconnect(address: string): void;
    sendTo(destination: string, message: any): void;
    sendAll(destinations: string[], message: any): void;
    connections(): connection.ConnectionAPI[];
    onConnected: event.Event<connection.ConnectionAPI>;
    onDisconnected: event.Event<connection.ConnectionAPI>;
    onRoutingChanged: event.Event<routing.RoutingTable>;
    onMessage: event.Event<any>;
}

export class Hub {
    private _peers: ConnectionManager;
    private _routing: routing.RoutingTable = new routing.RoutingTable();
    private _guid: string;

    private _onConnected: event.Event<connection.ConnectionAPI> = new event.Event<connection.ConnectionAPI>()
    private _onDisconnected: event.Event<connection.ConnectionAPI> = new event.Event<connection.ConnectionAPI>();
    private _onRoutingChanged: event.Event<routing.RoutingTable> = new event.Event<routing.RoutingTable>();
    private _onMessage: event.Event<any> = new event.Event<any>();

    constructor(guid: string, peers: ConnectionManager) {
        this._peers = peers;
        this._guid = guid;

        this._peers.onAdd.on((connection) => {
            this._onConnected.emit(connection);
        });

        this._peers.onRemove.on((connection) => {
            this._onDisconnected.emit(connection);
        });

        this._routing.onChanged.on((routing) => {
            this._onRoutingChanged.emit(routing);
        });

        this._onConnected.on((connection) => {
            console.log('peer connected: ' + connection.endpoint + " (" + this._peers.length + ")");
            this._peers.get().forEach(function (other) {
                if (other === connection) return;
                connection.connected(other.endpoint);
                other.connected(connection.endpoint);
            });
        });

        this._onDisconnected.on((connection) => {
            console.log('peer disconnected: ' + connection.endpoint + " (" + this._peers.length + ")");
            this._peers.get().forEach(function (other) {
                if (other === connection) return;
                other.disconnected(connection.endpoint);
            });
        });

        this._onRoutingChanged.on((table) => {
            var serialized = table.serialize();
            this._peers.get().forEach(function (other) {
                other.addroutes(serialized);
            });
        });
    }

    private getApi(): HubAPI {
        return {
            guid: this._guid,
            connect: this._connect.bind(this),
            disconnect: this._disconnect.bind(this),
            sendTo: this._sendTo.bind(this),
            sendAll: this._sendAll.bind(this),
            connections: () => {
                return this._peers.get();
            },
            onConnected: this._onConnected,
            onDisconnected: this._onDisconnected,
            onRoutingChanged: this._onRoutingChanged,
            onMessage: this._onMessage,
        }
    }

    static create(guid: string, options: {
    } = {}): HubAPI {
        var manager = new connectionManager.ConnectionManager<connection.ConnectionAPI>();

        var hub = new Hub(guid, manager);

        return hub.getApi();
    }

    private _connect(address: string): wsConn.WebSocketConnectionAPI {
        var peer = wsConn.create(address);

        peer.onOpen.on(() => {
            this._peers.add(peer);
        });

        peer.onClose.on((event) => {
            this._peers.remove(peer);
        });

        peer.onRelay.on((data) => {
            var destination = this._peers.get(data.destination);
            if (!destination) return;
            console.log("relaying message from " + peer.endpoint + " to " + data.destination);
            destination.relayed(peer.endpoint, data.message);
        });

        peer.onIdentified.on((data) => {
            var row = new routing.RoutingRow(this._guid, data.authority, data.endpoint);
            this._routing.add(row);
            var table = this._routing.serialize();
            this._peers.get().forEach(function (other) {
                other.addroutes(table);
            });
        });

        peer.onRoutesReceived.on((table) => {
            var routes = routing.RoutingTable.deserialize(table);
            routes.subtract(this._routing);
            if (routes.length > 0) {
                this._routing.update(routes);
                this._onRoutingChanged.emit(this._routing);
            }
        });

        peer.onMessage.on((message) => {
            this._onMessage.emit(message);
        });

        return peer;
    }

    private _isConnected(address: string): boolean {
        return this._peers.get(address) !== undefined
    }

    private _disconnect(address: string): void {
        var peer = this._peers.get(address);
        peer.close();
    }

    private _sendTo(destination: string, message: any): void {
        var path = this._routing.findPath(this._guid, destination);
        var start = path.shift().endpoint;
        var peer = this._peers.get(start);

        message = [protocol.MESSAGE_TYPE.USER_MESSAGE, message];

        while (path.length > 0) {
            var target = path.pop();
            message = [
                protocol.MESSAGE_TYPE.RELAY,
                target.endpoint,
                message,
            ];
        }

        peer.send(message);
    }

    private _sendAll(destinations: string[], message: any): void {

        function walk(node: routing.PathTreeNode<routing.PathSegment>) {
            var pack: any[] = [];
            for (var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                pack.push(protocol.MESSAGE_TYPE.RELAY);
                pack.push(child.segment.endpoint);
                pack.push(walk(child));
            }

            for (var i = 0; i < node.ends.length; i++) {
                pack.push(protocol.MESSAGE_TYPE.USER_MESSAGE);
                pack.push(message);
            }

            return pack;
        }

        var paths = this._routing.findPaths(this._guid, destinations);
        var tree = routing.mergePaths(paths, (segment) => segment.endpoint);

        for (var i = 0; i < tree.length; i++) {
            var pack: any[] = [];
            var node = tree[i];
            var peer = this._peers.get(node.segment.endpoint);
            peer.send(walk(node));
        }
    }
}

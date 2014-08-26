﻿var event = require("./event");
var connectionManager = require("./connection-manager");
var wsConn = require("./websocket-connection");

var APIImpl = (function () {
    function APIImpl(options) {
        this._manager = options.manager;
        this._onConnected = options.onConnected;
        this._onDisconnected = options.onDisconnected;
    }
    Object.defineProperty(APIImpl.prototype, "connections", {
        get: function () {
            return this._manager.get();
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(APIImpl.prototype, "onConnected", {
        get: function () {
            return this._onConnected;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(APIImpl.prototype, "onDisconnected", {
        get: function () {
            return this._onDisconnected;
        },
        enumerable: true,
        configurable: true
    });
    return APIImpl;
})();
exports.APIImpl = APIImpl;

var Hub = (function () {
    function Hub(peers) {
        var _this = this;
        this.peers = peers;

        this.onConnected = new event.Event();
        this.onDisconnected = new event.Event();

        this.peers.onAdd.on(function (connection) {
            _this.onConnected.emit(connection);
            console.log('peer connected: ' + connection.address + " (" + _this.peers.length + ")");
            _this.peers.get().forEach(function (other) {
                if (other === connection)
                    return;
                connection.connected(other.address);
                other.connected(connection.address);
            });
        });

        this.peers.onRemove.on(function (connection) {
            _this.onDisconnected.emit(connection);
            console.log('peer disconnected: ' + connection.address + " (" + _this.peers.length + ")");
            _this.peers.get().forEach(function (other) {
                if (other === connection)
                    return;
                other.disconnected(connection.address);
            });
        });
    }
    Hub.prototype.getApi = function () {
        return new APIImpl({
            manager: this.peers,
            onConnected: this.onConnected,
            onDisconnected: this.onDisconnected
        });
    };

    Hub.create = function (options) {
        if (typeof options === "undefined") { options = {}; }
        var manager = new connectionManager.ConnectionManager();

        var hub = new Hub(manager);

        return hub.getApi();
    };

    Hub.prototype.connect = function (address) {
        var _this = this;
        var peer = wsConn.WebSocketConnection.create(address, this.peers);

        peer.onClose.on(function (event) {
            _this.peers.remove(peer);
        });

        return peer;
    };
    return Hub;
})();
//# sourceMappingURL=hub.js.map
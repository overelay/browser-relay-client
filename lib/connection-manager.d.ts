﻿import event = require("./event");
export interface IConnection {
    address: string;
}
export declare class ConnectionManager<T extends IConnection> {
    private connectionMap;
    private connectionList;
    public onAdd: event.Event<T>;
    public onRemove: event.Event<T>;
    constructor();
    public get(): T[];
    public get(address: string): T;
    public add(connection: T): boolean;
    public remove(connection: T): boolean;
    public length : number;
}
﻿interface Handler {
    callback: Function;
    context: any;
}

export interface Callback<T> {
    (arg1: T): void;
}

export interface IEvent<T> {
    emit(value: T): void;
    on(callback: Callback<T>, context?: any): void;
    off(callback: Callback<T>, context?: any): void;
}

export class Event<T> implements IEvent<T> {
    private _handlers: Handler[];
    private _context: any;

    constructor(context?: any) {
        this._handlers = [];
        this._context = context;
    }

    public emit(value: T): void {
        this._handlers.concat().forEach((handler) => {
            handler.callback.call(handler.context || this._context, value);
        });
    }

    public on(callback: Callback<T>, context?: any): void {
        if (arguments.length == 2) {
            for (var i = 0; i < this._handlers.length; i++) {
                var handler = this._handlers[i];
                if (handler.callback === callback && handler.context === context) return;
            }
        }
        this._handlers.push({ callback: callback, context: context });
    }

    public off(callback: Callback<T>, context?: any): void {
        var remaining: Handler[] = [];
        for (var i = 0; i < this._handlers.length; i++) {
            var handler = this._handlers[i];
            if (callback === null && handler.context === context) continue;
            if (arguments.length == 1 && handler.callback === callback) continue;
            if (handler.callback === callback && handler.context === context) continue;
            remaining.push(handler);
        }
        this._handlers = remaining;
    }
}

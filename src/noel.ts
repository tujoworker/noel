// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...

import { NoelConfig } from './interfaces';
import { NoelEventListener } from './types';
import { NoelBufferSizeNotValidError, NoelReplayNotEnabledError } from './errors';
import { NoelEvent } from './event';
import { NoelLogger } from './logger';
import { NoelEventListenerManager } from './event-listener-manager';

const defaultLogger = new NoelLogger();

export default class Noel {
    private noEventListenersWarning: boolean;

    private eventsMap: Map<string, NoelEvent> | null = null;

    private logger: NoelLogger;

    private replayEnabled: boolean;
    private replayBufferSize: number;

    constructor(config?: NoelConfig) {
        config = config || {};

        this.noEventListenersWarning = typeof config.noEventListenersWarning === 'boolean' ? config.noEventListenersWarning : true;

        this.replayBufferSize = config.replayBufferSize || 1;

        this.replayEnabled = typeof config.replay === 'boolean' ? config.replay : true;

        const logger = config.logger || defaultLogger;
        this.setLogger(logger);
    }

    emit(eventName: string, ...eventArgs: Array<any>) {
        const event = this.getEvent(eventName);
        event.emit(...eventArgs);
    }

    on(eventName: string, listener: NoelEventListener): NoelEventListenerManager {
        const event = this.getEvent(eventName);
        return event.on(listener);
    }

    removeListener(eventName: string, listener: NoelEventListener) {
        const eventsMap = this.eventsMap;
        if (eventsMap) {
            const event = eventsMap.get(eventName);
            if (event) {
                this.removeEventListener(event, listener);
            }
        }
    }

    removeEventListener(event: NoelEvent, listener: NoelEventListener) {
        event.removeListener(listener);
        const eventListenersCount = event.countListeners();
        if (eventListenersCount === 0) this.removeEvent(event.getName());
    }

    setLogger(logger: NoelLogger): void {
        this.logger = logger;
        if (this.eventsMap) {
            for (const event of this.eventsMap.values()) {
                event.setLogger(logger);
            }
        }
    }

    enableNoEventListenersWarning(): void {
        if (this.noEventListenersWarning) return;
        this.noEventListenersWarning = true;
        if (this.eventsMap) {
            for (const event of this.eventsMap.values()) {
                event.enableNoListenersWarning();
            }
        }
    }

    disableNoEventListenersWarning(): void {
        if (typeof this.noEventListenersWarning !== 'undefined' && !this.noEventListenersWarning) return;
        this.noEventListenersWarning = false;
        if (this.eventsMap) {
            for (const event of this.eventsMap.values()) {
                event.disableNoListenersWarning();
            }
        }
    }

    replayIsEnabled() {
        return this.replayEnabled;
    }

    enableReplay() {
        if (this.replayEnabled) return;
        this.enableEventsReplay();
        this.replayEnabled = true;
    }

    disableReplay() {
        if (!this.replayEnabled) return;
        this.disableEventsReplay();
        this.replayEnabled = false;
    }

    setReplayBufferSize(replayBufferSize: number) {
        if (!this.replayEnabled) throw new NoelReplayNotEnabledError();
        if (replayBufferSize <= 0) throw new NoelBufferSizeNotValidError('Replay buffer size needs to be >=1');
        this.replayBufferSize = replayBufferSize;
        this.setEventsReplayBuffersSize(this.replayBufferSize);
    }

    clearEventsReplayBuffers() {
        if (!this.replayEnabled) throw new NoelReplayNotEnabledError();
        const events = this.getEvents();
        for (const event of events) {
            event.clearReplayBuffer();
        }
    }

    clearReplayBufferForEvent(eventName: string): void {
        if (!this.replayEnabled) throw new NoelReplayNotEnabledError();
        const eventsMap = this.eventsMap;
        if (eventsMap) {
            const event = eventsMap.get(eventName);
            if (event) event.clearReplayBuffer();
        }
    }

    getEvent(eventName: string): NoelEvent {
        const eventsMap = this.getEventsMap();
        let event = eventsMap.get(eventName);
        if (!event) {
            event = this.makeEvent(eventName);
            eventsMap.set(eventName, event);
        }
        return event;
    }

    removeEvent(eventName: string) {
        const eventsMap = this.eventsMap;
        if (eventsMap) {
            eventsMap.delete(eventName);
        }
    }

    removeAllListeners(eventName: string) {
        const eventsMap = this.eventsMap;
        if (eventsMap) {
            const event = eventsMap.get(eventName);
            if (event) event.removeAllListeners();
        }
    }

    private makeEvent(eventName: string): NoelEvent {
        return new NoelEvent({
            name: eventName,
            replay: this.replayEnabled,
            replayBufferSize: this.replayBufferSize,
            noListenersWarning: this.noEventListenersWarning,
            noel: this,
            logger: this.logger
        });
    }

    private setEventsReplayBuffersSize(replayBuffersSize: number): void {
        const eventsMap = this.eventsMap;
        if (eventsMap) {
            const events = eventsMap.values();
            for (const event of events) {
                event.setReplayBufferSize(replayBuffersSize);
            }
        }
    }

    private disableEventsReplay() {
        const eventsMap = this.eventsMap;
        if (eventsMap) {
            const events = eventsMap.values();
            for (const event of events) {
                event.disableReplay();
            }
        }
    }

    private enableEventsReplay() {
        const eventsMap = this.eventsMap;
        if (eventsMap) {
            const events = eventsMap.values();
            for (const event of events) {
                event.enableReplay();
            }
        }
    }

    private getEvents(): IterableIterator<NoelEvent> {
        const eventsMap = this.getEventsMap();
        return eventsMap.values();
    }

    private getEventsMap(): Map<string, NoelEvent> {
        return this.eventsMap || (this.eventsMap = new Map());
    }
}

/// <reference types="vite/client" />

declare module "*.grammar" {
    import {LRParser} from "@lezer/lr";
    export const parser: LRParser;
}
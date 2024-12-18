// Code taken from https://github.com/noahcoolboy/funcaptcha

import { GetTokenResult } from "./getToken";
import util from "./internal/util";

export interface TokenInfo {
    token: string;
    r: string;
    metabgclr: string;
    mainbgclr: string;
    guitextcolor: string;
    metaiconclr: string;
    meta_height: string;
    meta_width: string;
    meta: string;
    pk: string;
    dc: string;
    at: string;
    cdn_url: string;
    lurl: string;
    surl: string;
    smurl: string;
    // Enable keyboard biometrics
    kbio: boolean;
    // Enable mouse biometrics
    mbio: boolean;
    // Enable touch biometrics
    tbio: boolean;
}

export interface SessionOptions {
    userAgent?: string;
    proxy?: string;
}

let parseToken = (token: string): TokenInfo =>
    Object.fromEntries(
        token
            .split("|")
            .map((v) => v.split("=").map((v) => decodeURIComponent(v)))
    );

export class Session {
    public token: string;
    public tokenInfo: TokenInfo;
    private userAgent: string;
    private proxy: string;

    constructor(
        token: string | GetTokenResult,
        sessionOptions?: SessionOptions
    ) {
        if (typeof token === "string") {
            this.token = token;
        } else {
            this.token = token.token;
        }
        if (!this.token.startsWith("token="))
            this.token = "token=" + this.token;

        this.tokenInfo = parseToken(this.token);
        this.tokenInfo.mbio = typeof(token) !== "string" ? token.mbio ?? false : false
        this.userAgent = sessionOptions?.userAgent || util.DEFAULT_USER_AGENT;
        this.proxy = sessionOptions?.proxy;
    }

    getEmbedUrl(): string {
        return `${this.tokenInfo.surl}/fc/gc/?${util.constructFormData(
            this.tokenInfo
        )}`;
    }
}
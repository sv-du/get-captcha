import getToken from "./CaptchaStuff/getToken"
import { Session } from "./CaptchaStuff/Session";

export interface Env {
	API_KEY: string,
	username: string,
	password: string
}

const CAPTCHA_KEY = "476068BF-9607-4799-B53D-966BE98E2B81";

async function login(username: string, password: string, csrfToken?: string, captchaId?: string, captchaToken?: string) {
	return await fetch("https://auth.roblox.com/v2/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1",
			"X-CSRF-TOKEN": csrfToken || "",
		},
		body: JSON.stringify({
			"ctype": "Username",
			"cvalue": username,
			"password": password,
			"captchaId": captchaId || "",
			"captchaToken": captchaToken || ""
		})
	});
}

async function doPostToken(env: Env, csrfToken: string, captchaID: string, captchaToken: string) {
	let res = await login(env.username, env.password, csrfToken, captchaID, captchaToken);
	let resText = await res.text();
	let resJSON = JSON.parse(resText);
	if(resJSON.errors[0].message === "Token Validation Failed") {
		while(true) {
			csrfToken = res.headers.get("x-csrf-token");
			res = await login(env.username, env.password, csrfToken, captchaID, captchaToken);
			resText = await res.text();
			resJSON = JSON.parse(resText);
			if(resJSON.errors[0].message !== "Token Validation Failed") break;
		}
		return resText
	} else {
		return resText
	}
}

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		try {
			let key = request.headers.get("api-key");
			if(key !== env.API_KEY) return new Response("Invalid API key", {status: 403});
			if(request.headers.get("csrfToken")) {
				let cookie = await doPostToken(env, request.headers.get("csrfToken"), request.headers.get("captchaID"), request.headers.get("captchaToken"));
				return new Response(cookie);
			}
			let res = await login(env.username, env.password);
			let resText = await res.text();
			let csrfToken;
			while(true) {
				csrfToken = res.headers.get("x-csrf-token");
				res = await login(env.username, env.password, csrfToken);
				resText = await res.text();
				let resJSON = JSON.parse(resText);
				if(resJSON.errors[0].message !== "Token Validation Failed") break;
			}
			let fieldData = JSON.parse(JSON.parse(resText).errors[0].fieldData);
			if(!fieldData) return new Response(`A response that wasn't a captcha response was recieved. The API response is below\n\n${resText}`, {status: 403});
			let captchaID = fieldData.unifiedCaptchaId;
			let dataBlob = fieldData.dxBlob
			await timeout(5000);
			let captchaToken = await getToken({
				pkey: CAPTCHA_KEY,
				surl: "https://roblox-api.arkoselabs.com",
				data: {
					blob: dataBlob
				},
				headers: {
					"user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1"
				},
				site: "https://www.roblox.com",
				location: "https://www.roblox.com"
			});
			let session = new Session(captchaToken, {
				userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1"
			})
			let response = JSON.stringify({
				htmlFileContent: `<!DOCTYPE html>\n<iframe src="${session.getEmbedUrl()}" height="290" width="302"></iframe>`,
				csrfToken: csrfToken,
				captchaID: captchaID,
				captchaToken: captchaToken.token
			});
			console.log(JSON.parse(response).htmlFileContent)
			return new Response(response);
		} catch(e) {
			return new Response(`Something went wrong: ${e}. Please report this on the Github`, {status: 500})
		}
	},
};
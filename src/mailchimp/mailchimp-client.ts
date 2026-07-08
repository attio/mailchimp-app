import {complete, errored, isErrored, type Result} from "@attio/fetchable"
import md5 from "md5"
import {z} from "zod"
import {
    type MailchimpError,
    type MailchimpResult,
    missingDatacenterError,
    unauthorizedMailchimpError,
    unexpectedMailchimpError,
} from "./types/errors"

/**
 * The OAuth metadata endpoint returns the user's datacenter routing info. Mailchimp populates
 * both `api_endpoint` (the full base URL) and `dc` (the bare server prefix), but we treat each as
 * optional and only require that *one* of them is present so a payload that omits `dc` (or shapes
 * it unexpectedly) does not block every API call.
 * @see https://mailchimp.com/developer/marketing/guides/access-user-data-oauth-2/#oauth-2-workflow-overview
 */
const metadataResponseSchema = z.object({
    dc: z.string().optional(),
    api_endpoint: z.string().url().optional(),
})

/**
 * The metadata endpoint returns HTTP 200 with this body (rather than a 401) when the access token
 * is invalid or expired, e.g. `{"error": "invalid_token"}`.
 * @see https://mailchimp.com/developer/marketing/guides/access-user-data-oauth-2/
 */
const metadataErrorResponseSchema = z.object({
    error: z.string(),
})

const listResponseSchema = z.object({
    lists: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
        })
    ),
})

const memberResponseSchema = z.object({
    id: z.string(),
    email_address: z.string(),
    status: z.string(),
})

const mailchimpErrorResponseSchema = z
    .object({
        title: z.string(),
        detail: z.string(),
        type: z.string().optional(),
        instance: z.string().optional(),
        status: z.union([z.number(), z.string()]).optional(),
    })
    .passthrough()

export class MailchimpClient {
    private baseUrl: string | null = null

    constructor(private readonly token: string) {}

    async listAudiences(): MailchimpResult<Array<{id: string; name: string}>> {
        const result = await this.request({
            method: "GET",
            subUrl: "/lists?count=1000&fields=lists.id,lists.name",
            responseSchema: listResponseSchema,
        })

        if (isErrored(result)) {
            this.logClientMethodError("listAudiences", result.error)
            return result
        }

        return complete(result.value.lists)
    }

    /**
     * Add or update a list member
     * @see https://mailchimp.com/developer/marketing/api/list-members/add-or-update-list-member/
     */
    async addMemberToAudience({
        listId,
        emailAddress,
        firstName,
        lastName,
    }: {
        listId: string
        emailAddress: string
        firstName: string | undefined
        lastName: string | undefined
    }): MailchimpResult<{id: string; email_address: string; status: string}> {
        const subscriberHash = md5(emailAddress.toLowerCase())

        const result = await this.request({
            method: "PUT",
            subUrl: `/lists/${listId}/members/${subscriberHash}`,
            body: {
                email_address: emailAddress,
                status_if_new: "subscribed",
                merge_fields: {
                    FNAME: firstName ?? "",
                    LNAME: lastName ?? "",
                },
            },
            responseSchema: memberResponseSchema,
        })

        if (isErrored(result)) {
            this.logClientMethodError("addMemberToAudience", result.error)
            return result
        }

        return complete(result.value)
    }

    /**
     * Resolves the API base URL for this OAuth token. Mailchimp routes API calls to a per-user
     * datacenter; fetching metadata is a required step when using OAuth to access user data (see
     * OAuth 2 workflow overview). We substitute the `dc` server prefix into the base URL template
     * and fall back to the full `api_endpoint` the metadata returns, so the call only fails when
     * Mailchimp gives us neither.
     * @see https://mailchimp.com/developer/marketing/guides/access-user-data-oauth-2/#oauth-2-workflow-overview
     */
    private async resolveBaseUrl(): MailchimpResult<string> {
        const response = await fetch("https://login.mailchimp.com/oauth2/metadata", {
            method: "GET",
            headers: {
                Authorization: `OAuth ${this.token}`,
            },
        })

        const text = await response.text()
        const json = text ? safeParseJson(text) : undefined
        const providerError = mailchimpErrorFromResponse(response, json)

        if (providerError !== null) {
            return errored(providerError)
        }

        if (!response.ok) {
            console.error(
                JSON.stringify({
                    msg: "Unexpected error response from Mailchimp metadata endpoint",
                    status: response.status,
                    statusText: response.statusText,
                    body: text.slice(0, 500),
                })
            )
            return errored(unexpectedMailchimpError())
        }

        // The metadata endpoint responds with HTTP 200 and an `{error}` body when the token is
        // invalid or expired, so we detect that here rather than relying on the status code.
        if (metadataErrorResponseSchema.safeParse(json).success) {
            return errored(unauthorizedMailchimpError())
        }

        const parseResult = metadataResponseSchema.safeParse(json)

        if (!parseResult.success) {
            console.error(
                JSON.stringify({
                    msg: "Failed to parse Mailchimp metadata response",
                    error: parseResult.error.issues,
                })
            )
            return errored(unexpectedMailchimpError())
        }

        return baseUrlFromMetadata(parseResult.data)
    }

    private async request<T>({
        method,
        subUrl,
        body,
        responseSchema,
    }: {
        method: "GET" | "PUT"
        subUrl: string
        body?: Record<string, unknown>
        responseSchema: z.ZodType<T, z.ZodTypeDef, unknown>
    }): MailchimpResult<T> {
        if (this.baseUrl === null) {
            const baseUrlResult = await this.resolveBaseUrl()
            if (isErrored(baseUrlResult)) {
                return baseUrlResult
            }
            this.baseUrl = baseUrlResult.value
        }

        const response = await fetch(`${this.baseUrl}/3.0${subUrl}`, {
            method,
            headers: {
                Authorization: `OAuth ${this.token}`,
                ...(body !== undefined ? {"Content-Type": "application/json"} : {}),
            },
            ...(body !== undefined ? {body: JSON.stringify(body)} : {}),
        })

        const text = await response.text()
        const json = text ? safeParseJson(text) : undefined
        const providerError = mailchimpErrorFromResponse(response, json)

        if (providerError !== null) {
            return errored(providerError)
        }

        if (!response.ok) {
            console.error(
                JSON.stringify({
                    msg: "Unexpected error response from Mailchimp API",
                    method,
                    subUrl,
                    status: response.status,
                    statusText: response.statusText,
                    body: text.slice(0, 500),
                })
            )
            return errored(unexpectedMailchimpError())
        }

        const parseResult = responseSchema.safeParse(json)

        if (!parseResult.success) {
            console.error(
                JSON.stringify({
                    msg: "Failed to parse Mailchimp API response",
                    method,
                    subUrl,
                    error: parseResult.error.issues,
                })
            )
            return errored(unexpectedMailchimpError())
        }

        return complete(parseResult.data)
    }

    private logClientMethodError(
        clientMethod: "listAudiences" | "addMemberToAudience",
        error: MailchimpError[]
    ) {
        console.error(
            JSON.stringify({
                msg: "Mailchimp client method failed",
                clientMethod,
                error,
            })
        )
    }
}

/**
 * Base URL template used by the official Mailchimp client. The `server` token is substituted with
 * the user's datacenter prefix (`dc`); left unresolved it points at the placeholder host, which is
 * why we never route to it.
 * @see https://github.com/mailchimp/mailchimp-marketing-node/blob/master/src/ApiClient.js
 */
const BASE_URL_TEMPLATE = "https://server.api.mailchimp.com"

/**
 * Resolves the Mailchimp API base URL from the OAuth metadata, following the same mechanic as the
 * official client: substitute the `dc` server prefix into the base URL template. When `dc` is
 * absent we fall back to the full `api_endpoint` the metadata provides, and when neither is present
 * we return an error since there is no datacenter to route to.
 */
export function baseUrlFromMetadata({
    api_endpoint,
    dc,
}: {
    api_endpoint?: string
    dc?: string
}): Result<string, MailchimpError[]> {
    if (dc) {
        return complete(BASE_URL_TEMPLATE.replace("server", dc))
    }

    if (api_endpoint) {
        return complete(api_endpoint.replace(/\/+$/, ""))
    }

    return errored(missingDatacenterError())
}

function safeParseJson(text: string): unknown {
    try {
        return JSON.parse(text)
    } catch {
        return undefined
    }
}

function mailchimpErrorFromResponse(response: Response, json: unknown): MailchimpError[] | null {
    const parsedError = mailchimpErrorResponseSchema.safeParse(json)

    if (parsedError.success) {
        return [
            {
                title: parsedError.data.title,
                detail: parsedError.data.detail,
                code: parsedError.data.type ?? String(parsedError.data.status ?? response.status),
                id: parsedError.data.instance,
            },
        ]
    }

    if (response.status === 401) {
        return [
            {
                title: "Unauthorized",
                detail: "Mailchimp connection is unauthorized. Please reconnect your Mailchimp account.",
                code: "UNAUTHORIZED",
            },
        ]
    }

    if (response.status === 403) {
        return [
            {
                title: "Forbidden",
                detail: "Access to this Mailchimp resource is forbidden. Please check your account permissions.",
                code: "FORBIDDEN",
            },
        ]
    }

    if (response.status === 404) {
        return [
            {
                title: "Not found",
                detail: "The selected Mailchimp audience could not be found. Please choose a valid audience.",
                code: "NOT_FOUND",
            },
        ]
    }

    return null
}

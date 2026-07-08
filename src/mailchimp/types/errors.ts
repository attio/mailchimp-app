import type {AsyncResult} from "@attio/fetchable"

/** Error object returned by Mailchimp API error payloads. */
export type MailchimpError = {
    title: string
    detail: string
    code?: string
    id?: string
}

/** Unified result type for Mailchimp operations. */
export type MailchimpResult<T = void> = AsyncResult<T, MailchimpError[]>

/** Shared label for user-facing Mailchimp messages. */
const MAILCHIMP_USER_LABEL = "Mailchimp"

/** Creates a generic unexpected Mailchimp error for caught exceptions. */
export function unexpectedMailchimpError(): MailchimpError[] {
    return [
        {
            title: "Unexpected error",
            detail: "An unexpected error occurred.",
        },
    ]
}

/**
 * Creates an error for when the OAuth metadata response provides neither `api_endpoint` nor `dc`,
 * leaving us unable to determine the datacenter to route API calls to.
 */
export function missingDatacenterError(): MailchimpError[] {
    return [
        {
            title: "Datacenter not found",
            detail: "Could not determine your Mailchimp datacenter. Please reconnect your Mailchimp account.",
            code: "MISSING_DATACENTER",
        },
    ]
}

/**
 * Creates an unauthorized error. Mailchimp's OAuth metadata endpoint returns HTTP 200 with an
 * `{error: "invalid_token"}` body (rather than a 401) when the access token is invalid or expired,
 * so this is also used to surface that case as an authorization failure.
 */
export function unauthorizedMailchimpError(): MailchimpError[] {
    return [
        {
            title: "Unauthorized",
            detail: "Mailchimp connection is unauthorized. Please reconnect your Mailchimp account.",
            code: "UNAUTHORIZED",
        },
    ]
}

/** Prefixes a message so users can distinguish Mailchimp-originated errors. */
function mailchimpUserMessage(message: string): string {
    return `${MAILCHIMP_USER_LABEL}: ${message}`
}

/** Converts Mailchimp API errors into a human-readable message. */
export function mailchimpApiErrorUserMessage(errors: MailchimpError[]): string {
    const message =
        errors
            .map((error) => error.detail)
            .filter(Boolean)
            .join(" ") || "An unexpected error occurred."

    return mailchimpUserMessage(message)
}

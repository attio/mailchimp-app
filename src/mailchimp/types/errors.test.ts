import {describe, expect, it} from "vitest"
import {
    type MailchimpError,
    mailchimpApiErrorUserMessage,
    missingDatacenterError,
    unauthorizedMailchimpError,
} from "./errors"

describe(mailchimpApiErrorUserMessage, () => {
    it("prefixes the joined error details with the Mailchimp label", () => {
        const errors: MailchimpError[] = [
            {title: "Bad request", detail: "The audience could not be found."},
        ]

        expect(mailchimpApiErrorUserMessage(errors)).toBe(
            "Mailchimp: The audience could not be found."
        )
    })

    it("joins multiple error details with a space", () => {
        const errors: MailchimpError[] = [
            {title: "A", detail: "First problem."},
            {title: "B", detail: "Second problem."},
        ]

        expect(mailchimpApiErrorUserMessage(errors)).toBe(
            "Mailchimp: First problem. Second problem."
        )
    })

    it("ignores empty details when building the message", () => {
        const errors: MailchimpError[] = [
            {title: "A", detail: ""},
            {title: "B", detail: "Only this one."},
        ]

        expect(mailchimpApiErrorUserMessage(errors)).toBe("Mailchimp: Only this one.")
    })

    it("falls back to a generic message when there are no usable details", () => {
        expect(mailchimpApiErrorUserMessage([])).toBe("Mailchimp: An unexpected error occurred.")
        expect(mailchimpApiErrorUserMessage([{title: "A", detail: ""}])).toBe(
            "Mailchimp: An unexpected error occurred."
        )
    })
})

describe(missingDatacenterError, () => {
    it("returns a dedicated error tagged with the MISSING_DATACENTER code", () => {
        expect(missingDatacenterError()).toEqual([
            {
                title: "Datacenter not found",
                detail: "Could not determine your Mailchimp datacenter. Please reconnect your Mailchimp account.",
                code: "MISSING_DATACENTER",
            },
        ])
    })
})

describe(unauthorizedMailchimpError, () => {
    it("returns an error tagged with the UNAUTHORIZED code", () => {
        expect(unauthorizedMailchimpError()).toEqual([
            {
                title: "Unauthorized",
                detail: "Mailchimp connection is unauthorized. Please reconnect your Mailchimp account.",
                code: "UNAUTHORIZED",
            },
        ])
    })
})

import {isComplete, isErrored} from "@attio/fetchable"
import {describe, expect, it} from "vitest"
import {baseUrlFromMetadata} from "./mailchimp-client"

describe(baseUrlFromMetadata, () => {
    it("substitutes the dc into the base URL template, preferring it over api_endpoint", () => {
        const result = baseUrlFromMetadata({
            api_endpoint: "https://us2.api.mailchimp.com",
            dc: "us19",
        })

        expect(isComplete(result) && result.value).toBe("https://us19.api.mailchimp.com")
    })

    it("substitutes the dc into the base URL template when api_endpoint is absent", () => {
        const result = baseUrlFromMetadata({dc: "us19"})

        expect(isComplete(result) && result.value).toBe("https://us19.api.mailchimp.com")
    })

    it("falls back to api_endpoint when dc is absent", () => {
        const result = baseUrlFromMetadata({api_endpoint: "https://us2.api.mailchimp.com"})

        expect(isComplete(result) && result.value).toBe("https://us2.api.mailchimp.com")
    })

    it("strips a trailing slash from the api_endpoint fallback", () => {
        const result = baseUrlFromMetadata({api_endpoint: "https://us2.api.mailchimp.com/"})

        expect(isComplete(result) && result.value).toBe("https://us2.api.mailchimp.com")
    })

    it("errors when neither api_endpoint nor dc is provided", () => {
        const result = baseUrlFromMetadata({})

        expect(isErrored(result) && result.error[0]?.code).toBe("MISSING_DATACENTER")
    })
})

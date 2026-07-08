import {getUserConnection} from "attio/server"
import {MailchimpClient} from "./mailchimp-client"

export function getMailchimp(): MailchimpClient {
    return new MailchimpClient(getUserConnection().value)
}

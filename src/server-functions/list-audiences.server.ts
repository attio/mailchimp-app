import {getMailchimp} from "../mailchimp/get-mailchimp"
import type {MailchimpResult} from "../mailchimp/types/errors"

export default async function listAudiences(): MailchimpResult<Array<{id: string; name: string}>> {
    return getMailchimp().listAudiences()
}

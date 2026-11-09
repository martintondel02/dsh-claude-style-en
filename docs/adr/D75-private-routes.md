# D75. Private channels and the security boundary

- **Replaces**: D11

## Background

The skin needs private channels of its own: reading and writing settings, forwarding account information, deleting sessions. These channels live inside the host's process and page, and the host may be bound to a LAN, while the page can drive an agent that executes commands; a plugin's own channels are not inside the host's request fence, and of the settings documents only the one on the machine running the host is authoritative.

The host decides by address who gets the page and the API: requests from the loopback address, the address it is bound to, and addresses declared at deployment get the full page, and requests on other addresses are refused. The settings document is served with the page, so a page opened through a LAN address or a tunnel reads and writes the same copy as a loopback page.

## Decision

- Every piece of content crossing between the skin and the host, or between this machine and a remote one, travels on the host's existing channels and fence; the skin opens no parallel read-write path of its own.
- A private channel first asks the host whether the request should be refused, and a refused request is not handled; when the host has no such service, the built-in substitute lets through only requests from the local loopback.
- The "from this machine" decision rests on the one item the requester cannot write, the peer address; a loopback host name, no cross-site marker, and an origin matching the host must all hold at once, and none of them counts on its own since any of them can be forged.
- Settings are read and written through one transport only, the official config form: bind the namespace the host actually offers, and read and write through the form's controller; the skin does not reimplement the write queue and revision fence.
- A field the page has just written is not overwritten by the document until the host answers: a document re-read while the write is still in flight still carries the value from before the change, and adopting it would make the control just pressed jump back to the old value; the binding holds such fields and takes the host's answer once it arrives.
- Whatever namespaces the host offers, the skin uses. The answer is given by the host per address, and the skin does not first judge whether this page can write.
- The host half forwards the account contract, and the browser half recognizes only one fallback order: the nickname and the avatar each live in one identity store, and the greeting and the account row read only that store.
- Every foreign string is treated as data: text from settings, the account service, the system and other plugins is written only as text nodes or element attributes, icon copies are cloned nodes, and markup is never re-parsed.

## Consequences

- A private channel depends on the host's request fence and config-form service; when the host is absent the built-in substitute serves only this machine, and remote access is refused.
- Which pages on which addresses can write settings is decided by the host's deployment declaration: a page on a trusted address reads and writes the same settings as a loopback page, and on an undeclared address a page cannot reach the host.
- Abandoned: implementing a settings sync and request authentication of one's own; having the skin judge the page's read-write permission a second time; scattering the account fallback order across the places that display it.
- What it buys: a new channel or a new display does not have to judge the security boundary again, and there is one place for the security decision.

## Reconsider when

- When the host provides route registration with authentication of its own, or a way to register settings that does not depend on the config form, attach to the host and delete the built-in substitute.
- When the host gives different read and write permissions for the same kind of address, or offers a permission declaration per page, the skin displays by that declaration and no longer assumes every page it can read it can write.
- When the host provides a unified display-name and avatar service, or the account contract gains an upgrade channel, attach to the host.

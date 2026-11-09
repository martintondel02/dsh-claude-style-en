# D79. Model rules read both the id and the display name

## Background

In the host's model catalog a model has two fields: the id (the string sent to the provider) and the display name (the string the user can change in settings). Relay stations and self-hosted services often write the id as an alias of their own (`kmodel`, `dashscope_qmodel`), and what actually says which model this is, is the display name the user writes in the second column (`kimi-k2.6`, `qwen-3.6-plus`). When copy rules and vendor lockups read only the id, these rows have no description and draw no vendor mark, and they are exactly the rows that need both most; a user who writes the model's official name as the display name wants the interface to read it by that name.

## Decision

- A copy rule or a vendor rule tries the model id first, then the display name; the first candidate with a rule claiming it is the match.
- The id comes before the display name: the id is the string the provider and the host agree on, so changing the display name does not move a row off its own rule, nor let a renamed row take the copy another row has already claimed.
- Vendor lockups have only these two candidates, and the provider route still plays no part: a relay station's mark on models it did not make reads as the wrong answer.
- A family rule has one more candidate: `provider/id`, positioned between the id and the display name and formed from the id alone. A display name is the user's own spelling and forms no route.
- Both strings are folded to lowercase before they reach the rules, and the rules still carry the `i` flag.
- The selector's repaint signature includes each row's display name: a rename has to repaint the card on the spot, or it would take the next page turn to show.

## Consequences

- A rule anchored on the id (`deepseek.*flash`) does not apply to rows whose id is an alias; those rows land on a broader family rule through the display name. To make them read more specific copy, write the display name in the same shape as the id.
- The display name is filled in by the user, so the string the rule table reads is the user's content; the rules still only match, and the copy and vendor marks always come from the document shipped with the package.
- When a model's display name changes, its description line and vendor mark may change with it; that is the visible, direct result of the user rewriting the second column.
- Abandoned: reading only the display name. A relay station's display name is often left empty, and the second column then falls back to the id, so reading the name reads nothing.
- Abandoned: having the user fill in the copy and vendor mark by hand for every model. Every catalog change would mean filling them again, the opposite of the direction that copy is data and extending the copy table changes no code (D5).

## Reconsider when

- When the host's model catalog interface provides the vendor and localized copy directly, the rule table retires as a whole and those fields are read instead.

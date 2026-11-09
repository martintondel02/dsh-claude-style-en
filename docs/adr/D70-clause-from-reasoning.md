# D70. The clause read from the reasoning text

## Background

The waiting line has to say what this turn is doing right now, and one of its sources is the reasoning text the model writes itself: handing the reader a sentence like "I am checking the file is true" as it stands is more credible than any paraphrase. No off-the-shelf library answers this: general tools solve sentence boundaries, and only shape rules can answer "which sentence is talking about the action at this moment." Every relaxation of the rules admits another kind of false statement, every tightening admits another kind of silence, and this line states a fact that the reader uses to judge what this turn is doing.

## Decision

- Only actions that have already started are stated. A clause is anchored on an auxiliary verb (contractions included, `have been` for the perfect continuous included) plus a participle, with at most two closed-class words between them; negations and intentions not yet begun (`Let me …`, `about to …`, a bare participle) are not read, and when nothing can be read it falls back to the brand's own waiting word — the sentence that is always true.
- Sentence boundaries are not written locally. Where a sentence ends is left to the page's own sentence rules (`Intl.Segmenter`); locally only the punctuation of the clause layer remains, so a period in a file name, version number or abbreviation does not cut the statement short.
- The subject does not enter the clause, and attribution is not judged by subject. The same shape covers both "It's reading the file" and "The build is running"; there is no local basis for telling them apart, so they are not told apart.
- Only one shape is decided locally: an English auxiliary plus participle. The model's own words are carried out as they stand, with inline markers (backticks, paired emphasis, link brackets) stripped; words inside quotation marks are not read — when the model quotes a sentence it read, or even quotes this line's own waiting word, that is not it saying what it is doing. The Chinese progressive marker "正在" does not become a rule: it takes the same form as this line's waiting word, and locally there is no word list that can separate it from "正在读取 app.js"; read wrong, what reaches the reader is the model's discussion of this line.
- Only the tail of the text is read, and the run read last time is remembered: this line reads four times a second, and reading the same run again produces no new conclusion.
- A written wording is locked for a second, and the model's own clause has a line of its own: it stands until the next intention arrives. The model writes several sentences a second, and between clauses there are beats with nothing to read (thinking, or a step just begun with nothing written yet); falling back to the waiting word there would make this line flicker between two statements. When a new clause, a call's own wording or a state such as writing the answer arrives, it gives way.
- No model request is made, and no request sent to the model is changed. Every decision this line makes happens locally in the browser half.

## Consequences

- The actions that can be read are the English progressive and perfect continuous; given up are plan sentences, wording in Chinese reasoning, content inside quotation marks, and correct attribution when the sentence's subject has nothing to do with this turn.
- What it buys is a statement with zero calls and zero dependencies, taken word for word from the model, so the reader's wait gains no round trip.
- The clause's word rule no longer depends on any external word list or tagger, at the cost of a very short list to stop a participle that is also an `-ing` noun.
- The clause does not change before the next sentence of intent: the reader need not chase between two statements, at the cost that when the model stops saying what it is doing for a long time, this line still carries the clause it last said.

## Reconsider when

- When the host states directly what this turn is doing, this reading rule retires.
- When the model writing its own summary by convention (at the prompt layer) becomes practical and cheap, use the model's own summary.

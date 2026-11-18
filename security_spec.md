# SportUp Security Specification & Invariants

## 1. Data Invariants
1. **User Isolation & PII Segregation**: Users may only read or write their own `/users/{userId}`, `/users/{userId}/private/{docId}`, `/users/{userId}/teamMemberships/{teamId}`, `/progress/{progressId}`, `/chips/{userId}`, and `/subscriptions/{userId}`. Email PII resides strictly in `/users/{userId}/private/account`.
2. **Team Membership Gate**: Only current members verified in `/teams/{teamId}/members/$(request.auth.uid)` may read `/teams/{teamId}`, `/teams/{teamId}/members`, `/teams/{teamId}/messages`, or `/teams/{teamId}/matches`.
3. **Immutable Ownership & Timestamps**: `ownerId`, `senderId`, `userId`, and `createdAt` cannot be reassigned after creation; `createdAt` and `updatedAt` must equal `request.time`.
4. **Invite Code Integrity**: Joining a team requires reading the exact `teamInvites/{inviteCode}` document (`list` disabled to prevent scraping) and creating a membership document under `/teams/{teamId}/members/$(request.auth.uid)` whose `teamId` matches the invite target.
5. **Server-Validated Chips & Subscriptions**: Chip and subscription records carry a `serverSignature` and strict integer bounds (`dailyChips <= 500`, `purchasedChips <= 100000`, `subscriptionChips <= 10000`) validated by the Express/Cloud Functions endpoint before persistence.

## 2. Adversarial Payloads ("Dirty Dozen")
1. **Unauthenticated Profile Read**: `get /users/victim_uid` with `auth == null` -> `PERMISSION_DENIED`.
2. **Cross-User Chip Spoofing**: `update /chips/victim_uid { purchasedChips: 999999 }` as `attacker_uid` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Profile**: `create /users/attacker_uid { ..., isAdmin: true }` -> `PERMISSION_DENIED`.
4. **ID Poisoning**: `create /teams/invalid$$id_with_1500_chars` -> `PERMISSION_DENIED`.
5. **Non-Member Chat Snooping**: `list /teams/team_alpha/messages` by `outsider_uid` -> `PERMISSION_DENIED`.
6. **Sender Spoofing in Team Chat**: `create /teams/team_alpha/messages/m1 { senderId: "coach_uid", ... }` by `player_uid` -> `PERMISSION_DENIED`.
7. **Invite Code Enumeration**: `list /teamInvites` by signed-in user -> `PERMISSION_DENIED`.
8. **Unauthorized Roster Deletion**: `delete /teams/team_alpha/members/player_b` by `player_a` (non-owner, non-coach) -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: `create /teams/team_alpha/messages/m1 { createdAt: "2020-01-01T00:00:00Z" }` -> `PERMISSION_DENIED`.
10. **Progress Hijack**: `update /progress/victim_lesson1 { userId: "attacker_uid" }` -> `PERMISSION_DENIED`.
11. **Oversized Message Bomb**: `create /teams/team_alpha/messages/m1 { text: "<3000 chars>" }` -> `PERMISSION_DENIED`.
12. **Catalog Tampering**: `write /sports/futsal` by regular signed-in user -> `PERMISSION_DENIED`.

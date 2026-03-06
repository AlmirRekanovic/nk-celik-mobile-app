# NK Čelik Mobile App – Quick Review

## Scope
- Ran static checks and reviewed affected tab screens for authentication/context consistency.

## Findings
1. **Type mismatch in chat screen (fixed)**
   - `ChatScreen` consumed `user` from `useAuth()`, but `AuthContext` exposes `member`.
   - This caused TypeScript errors and could break runtime behavior for chat send/delete actions.

2. **Invalid icon imports in settings screen (fixed)**
   - `settings.tsx` imported `Moon`, `Sun`, and `Bell` icons that are not exported/used.
   - This caused TypeScript import errors and prevented successful type checking.

3. **Lint command currently blocked by Expo network fetch (not fixed in code)**
   - `expo lint` attempts remote dependency/version fetch and fails in this environment with `TypeError: fetch failed`.
   - Type checking passes after fixes.

## Outcome
- Project now passes `npm run typecheck`.
- Main review blockers discovered in tabs were resolved.


## Additional Review Pass
4. **Chat service authorization guard (fixed)**
   - `deleteMessage` and `updateMessage` accepted `memberId` but did not use it in the query filter.
   - Added `.eq('member_id', memberId)` to both operations for client-side ownership scoping.

5. **Settings cleanup (fixed)**
   - Removed unused `theme` destructuring from `useTheme()` in `settings.tsx`.

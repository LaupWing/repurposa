# Test Plan — Queue + Polling

- [ ] Generate blog → returns 202 immediately, post has status `generating`
- [ ] Job completes → post status becomes `draft`, content is populated
- [ ] Job fails → post status becomes `failed`
- [ ] Polling endpoint returns correct status while generating
- [ ] Polling endpoint returns post data when done
- [ ] User can only poll their own posts
- [ ] Regenerate sets status to `generating`, dispatches job
- [ ] Failed post shows retry option in UI
- [ ] User refreshes during generation → resumes polling
- [ ] Wizard is deleted after dispatch (not after job success)

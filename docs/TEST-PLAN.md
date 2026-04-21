# Test Plan

## Blog Generation (Queue + Polling)
- [ ] Generate blog → returns 202 immediately, post status = `generating`
- [ ] Job completes → status = `draft`, content populated
- [ ] Job fails → status = `failed`
- [ ] Polling returns correct status while generating
- [ ] Polling returns post data when done
- [ ] User can only poll their own posts
- [ ] Regenerate sets status to `generating`, dispatches new job
- [ ] Failed post shows retry option in UI
- [ ] User refreshes mid-generation → polling resumes
- [ ] Wizard deleted after dispatch (not after job success)

## WP Posts Sync
- [ ] Sync button fetches all published WP posts
- [ ] Posts already in Laravel (matched by `published_post_id`) are skipped
- [ ] New WP posts are created in Laravel with correct title, content, thumbnail, url
- [ ] Blog list refreshes after sync
- [ ] "Everything is already synced" toast when nothing new
- [ ] Sync fails gracefully with error toast

## Social Publishing
- [ ] Twitter post publishes successfully
- [ ] Threads post publishes successfully
- [ ] Instagram carousel publishes successfully
- [ ] LinkedIn post publishes successfully
- [ ] Failed publish shows error in UI
- [ ] `publishing` status prevents re-scheduling

## Auto-Repost (once backend is built)
- [ ] Repost schedule created on post scheduling
- [ ] Repost fires at correct interval
- [ ] Repost deleted after 12 hours
- [ ] Disable toggle stops future reposts

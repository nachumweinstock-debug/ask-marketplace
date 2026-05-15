import { PostHog } from 'posthog-node';

const posthog = process.env.POSTHOG_API_KEY
  ? new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST,
      enableExceptionAutocapture: true,
    })
  : {
      capture() {},
      identify() {},
      shutdownAsync: async () => {},
    };

export default posthog;

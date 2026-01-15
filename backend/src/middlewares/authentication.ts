/**
 * ReshADX - Authentication Middleware Wrapper
 * Re-exports the main authenticate middleware
 */

export {
  authenticate as authentication,
  authenticate,
  optionalAuthenticate
} from '../middleware/authenticate';

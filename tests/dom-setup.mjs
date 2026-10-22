// Registers a DOM on globalThis before React is imported. Import it first in a DOM test file.
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({ url: 'http://localhost/', width: 390, height: 844 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

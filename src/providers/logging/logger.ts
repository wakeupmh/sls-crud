
import { Logger } from '@aws-lambda-powertools/logger';

export default class LoggerProvider {
	private logger: Logger;
	constructor() {
		this.logger = new Logger({
      serviceName: 'grocery-store'
    });
	}

	info(message: string) {
		this.logger.info(message);
	}

	warn(message: string) {
		this.logger.warn(message);
	}

	error(message: string) {
		this.logger.error(message);
	}
}

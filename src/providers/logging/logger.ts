import { Logger } from "@aws-lambda-powertools/logger";

export default class LoggerProvider {
	private logger: Logger;
	constructor() {
		this.logger = new Logger({
			serviceName: "grocery-store",
			logBufferOptions: {
				flushOnErrorLog: true,
				enabled: true,
			},
		});
	}

	debug(message: string, data?: any) {
		this.logger.debug(message, data);
	}

	info(message: string, data?: any) {
		this.logger.info(message, data);
	}

	warn(message: string, data?: any) {
		this.logger.warn(message, data);
	}

	error(message: string, data?: any) {
		this.logger.error(message, data);
	}
}

import type { MiddyfiedHandler } from "@middy/core";
import middy from "@middy/core";

import {
	createResponseMiddleware,
	errorResponseMiddleware,
	parseBodyMiddleware,
} from "../../shared/middlewares";

export type CreateMiddlewareProps = {
	withDefault?: boolean;
	middlewares?: any[];
	middlewareProps?: any;
};

export class MiddlewareFactory {
	protected middy: MiddyfiedHandler | undefined;

	public create(handler: any, props: CreateMiddlewareProps = {}) {
		this.middy = middy();
		let middlewares: middy.MiddlewareObj[] = props?.middlewares || [];
		if (props?.withDefault !== false) {
			middlewares = [...middlewares, ...this.getDefaultMiddlewares()];
		}
		this.applyMiddlewares(middlewares, { ...(props?.middlewareProps || {}) });

		const newHandler = this.middy.handler(handler);
		return (event: any, context: any = {} as any) => newHandler(event, context);
	}

	public getDefaultMiddlewares(): any[] {
		return [
			parseBodyMiddleware,
			errorResponseMiddleware,
			createResponseMiddleware,
		];
	}

	protected applyMiddlewares(middlewares: any[], props: any): any {
		for (const middleware of middlewares) {
			this.middy?.use(middleware(props));
		}
	}
}

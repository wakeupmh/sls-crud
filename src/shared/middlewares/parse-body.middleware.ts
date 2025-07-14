export const parseBodyMiddleware = () => {
	const before = async (request: { event: { body: any } }) => {
		if (!request.event || !request.event.body) {
			return;
		}

		try {
			if (typeof request.event.body === "string") {
				try {
					request.event.body = JSON.parse(request.event.body);
				} catch (parseError) {
					console.error("Error parsing request body:", parseError);
				}
			}
		} catch (error) {
			console.error("Error in parseBodyMiddleware:", error);
		}
	};

	return {
		before,
	};
};

const { ZodError } = require("zod");

function validate(schemas) {
  return (req, res, next) => {
    const errors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      const result = schema.safeParse(req[source]);
      if (result.success) {
        req[source] = result.data;
      } else {
        errors.push({ source, issues: result.error.flatten() });
      }
    }

    if (errors.length > 0) {
      return res.status(422).json({ message: "Payload invalido.", details: errors });
    }

    next();
  };
}

module.exports = { validate };

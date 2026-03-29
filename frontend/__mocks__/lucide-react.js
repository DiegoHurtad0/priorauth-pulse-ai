// Mock all lucide-react icons as simple span elements for Jest tests
const React = require("react");

const createIcon = (name) => {
  const Icon = (props) => React.createElement("span", { "data-testid": `icon-${name}`, ...props });
  Icon.displayName = name;
  return Icon;
};

module.exports = new Proxy(
  {},
  {
    get(target, prop) {
      if (prop === "__esModule") return true;
      return createIcon(prop);
    },
  }
);

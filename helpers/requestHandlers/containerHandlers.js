const triggerCloseContainer = async () => {
  const dayfiContainer = document.getElementById("dayfi-container");
  dayfiContainer.removeChild(dayfiContainer.firstChild);
  return {};
};

module.exports = {
  triggerCloseContainer,
};

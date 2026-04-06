// Room plugins
export { councilChamberPlugin, createCouncilState } from "./rooms/councilChamber";
export { testLabPlugin, createTestLabState } from "./rooms/testLab";
export { receptionPlugin, createReceptionState } from "./rooms/reception";
export { commsHubPlugin, createCommsHubState } from "./rooms/commsHub";
export { bullpenPlugin, createBullpenState } from "./rooms/bullpen";
export { archivePlugin, createArchiveState } from "./rooms/archive";
export { breakroomPlugin, createBreakroomState } from "./rooms/breakroom";

// Source plugins
export { mockDataPlugin, createMockEventStream } from "./sources/mockData";

// Theme plugins
export { neonDarkTheme, warmOfficeTheme, minimalTheme, applyTheme } from "./themes/themes";

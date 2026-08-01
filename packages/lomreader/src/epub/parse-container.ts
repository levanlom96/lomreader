import { CONTAINER_PATH } from './constants';
import { readArchiveText, type EpubArchive } from './archive';
import { normalizeContainerPath } from './paths';
import { childElements, firstChildElement, getAttribute, parseXml } from './xml';

export function findPackageDocumentPath(archive: EpubArchive): string {
  const containerXml = readArchiveText(archive, CONTAINER_PATH);

  if (!containerXml) {
    throw new Error(`Missing required ${CONTAINER_PATH}`);
  }

  const doc = parseXml(containerXml);
  const containerElement = doc.documentElement;

  if (!containerElement) {
    throw new Error('container.xml is missing a root element');
  }

  const rootfiles = firstChildElement(containerElement, 'rootfiles');

  if (!rootfiles) {
    throw new Error('container.xml is missing rootfiles element');
  }

  const rootfile = childElements(rootfiles, 'rootfile')[0];

  if (!rootfile) {
    throw new Error('container.xml is missing rootfile element');
  }

  const fullPath = getAttribute(rootfile, 'full-path');

  if (!fullPath) {
    throw new Error('container.xml rootfile is missing full-path attribute');
  }

  const packagePath = normalizeContainerPath(fullPath);
  const packageXml = readArchiveText(archive, packagePath);

  if (!packageXml) {
    throw new Error(`Package document not found at ${packagePath}`);
  }

  return packagePath;
}

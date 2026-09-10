import { useCallback, useMemo, useState } from 'react';
import { FolderSimplePlusIcon as FolderPlus } from '@phosphor-icons/react/dist/csr/FolderSimplePlus';
import { XIcon as X } from '@phosphor-icons/react/dist/csr/X';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent } from '@/shared/ui';
import ErrorBanner from '@/modules/project-creation-wizard/ErrorBanner';
import StepConfiguration from '@/modules/project-creation-wizard/StepConfiguration';
import StepReview from '@/modules/project-creation-wizard/StepReview';
import WizardFooter from '@/modules/project-creation-wizard/WizardFooter';
import WizardProgress from '@/modules/project-creation-wizard/WizardProgress';
import { useGithubTokens } from '@/modules/project-creation-wizard/hooks/useGithubTokens';
import { cloneWorkspaceWithProgress, createProjectRequest } from '@/modules/project-creation-wizard/utils/workspaceApi';
import { isCloneWorkflow, shouldShowGithubAuthentication } from '@/modules/project-creation-wizard/utils/pathUtils';
import type { TokenMode, WizardFormState, WizardStep } from '@/shared/types';

type ProjectCreationWizardProps = {
  onClose: () => void;
  onProjectCreated?: (project?: Record<string, unknown>) => void;
};

const initialFormState: WizardFormState = {
  workspacePath: '',
  githubUrl: '',
  tokenMode: 'stored',
  selectedGithubToken: '',
  newGithubToken: '',
};

/** Rendered by the sidebar module's modal layer to create a new project or clone one from GitHub. */
export default function ProjectCreationWizard({
  onClose,
  onProjectCreated,
}: ProjectCreationWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<WizardStep>(1);
  const [formState, setFormState] = useState<WizardFormState>(initialFormState);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloneProgress, setCloneProgress] = useState('');

  const shouldLoadTokens =
    step === 1 && shouldShowGithubAuthentication(formState.githubUrl);

  const autoSelectToken = useCallback((tokenId: string) => {
    setFormState((previous) => ({ ...previous, selectedGithubToken: tokenId }));
  }, []);

  const {
    tokens: availableTokens,
    loading: loadingTokens,
    loadError: tokenLoadError,
    selectedTokenName,
  } = useGithubTokens({
    shouldLoad: shouldLoadTokens,
    selectedTokenId: formState.selectedGithubToken,
    onAutoSelectToken: autoSelectToken,
  });

  // Keep cross-step values in this component; local UI state lives in child components.
  const updateField = useCallback(<K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => {
    setFormState((previous) => ({ ...previous, [key]: value }));
  }, []);

  const updateTokenMode = useCallback(
    (tokenMode: TokenMode) => updateField('tokenMode', tokenMode),
    [updateField],
  );

  const handleNext = useCallback(() => {
    setError(null);

    if (step === 1) {
      if (!formState.workspacePath.trim()) {
        setError(t('projectWizard.errors.providePath'));
        return;
      }
      setStep(2);
    }
  }, [formState.workspacePath, step, t]);

  const handleBack = useCallback(() => {
    setError(null);
    setStep((previousStep) => (previousStep > 1 ? ((previousStep - 1) as WizardStep) : previousStep));
  }, []);

  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    setError(null);
    setCloneProgress('');

    try {
      const shouldCloneRepository = isCloneWorkflow(formState.githubUrl);

      if (shouldCloneRepository) {
        const project = await cloneWorkspaceWithProgress(
          {
            workspacePath: formState.workspacePath,
            githubUrl: formState.githubUrl,
            tokenMode: formState.tokenMode,
            selectedGithubToken: formState.selectedGithubToken,
            newGithubToken: formState.newGithubToken,
          },
          {
            onProgress: setCloneProgress,
          },
        );

        onProjectCreated?.(project);
        onClose();
        return;
      }

      const project = await createProjectRequest({
        path: formState.workspacePath.trim(),
      });

      onProjectCreated?.(project);
      onClose();
    } catch (createError) {
      const errorMessage =
        createError instanceof Error
          ? createError.message
          : t('projectWizard.errors.failedToCreate');
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }, [formState, onClose, onProjectCreated, t]);

  const shouldCloneRepository = useMemo(
    () => isCloneWorkflow(formState.githubUrl),
    [formState.githubUrl],
  );

  return (
    <Dialog open onOpenChange={open => { if (!open && !isCreating) onClose(); }}>
      <DialogContent wrapperClassName="z-[60]" aria-label={t('projectWizard.title')} className="w-full overflow-y-auto border-border bg-background dark:border-border dark:bg-secondary sm:max-w-2xl sm:border">
        <div className="flex items-center justify-between border-b border-border p-6 dark:border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent dark:bg-accent/50">
              <FolderPlus className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground dark:text-foreground">
              {t('projectWizard.title')}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common:buttons.close')}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-muted-foreground dark:hover:bg-accent dark:hover:text-muted-foreground"
            disabled={isCreating}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <WizardProgress step={step} />

        <div className="min-h-[300px] space-y-6 p-6">
          {error && <ErrorBanner message={error} />}

          {step === 1 && (
            <StepConfiguration
              workspacePath={formState.workspacePath}
              githubUrl={formState.githubUrl}
              tokenMode={formState.tokenMode}
              selectedGithubToken={formState.selectedGithubToken}
              newGithubToken={formState.newGithubToken}
              availableTokens={availableTokens}
              loadingTokens={loadingTokens}
              tokenLoadError={tokenLoadError}
              isCreating={isCreating}
              onWorkspacePathChange={(workspacePath) => updateField('workspacePath', workspacePath)}
              onGithubUrlChange={(githubUrl) => updateField('githubUrl', githubUrl)}
              onTokenModeChange={updateTokenMode}
              onSelectedGithubTokenChange={(selectedGithubToken) =>
                updateField('selectedGithubToken', selectedGithubToken)
              }
              onNewGithubTokenChange={(newGithubToken) =>
                updateField('newGithubToken', newGithubToken)
              }
              onAdvanceToConfirm={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepReview
              formState={formState}
              selectedTokenName={selectedTokenName}
              isCreating={isCreating}
              cloneProgress={cloneProgress}
            />
          )}
        </div>

        <WizardFooter
          step={step}
          isCreating={isCreating}
          isCloneWorkflow={shouldCloneRepository}
          onClose={onClose}
          onBack={handleBack}
          onNext={handleNext}
          onCreate={handleCreate}
        />
      </DialogContent>
    </Dialog>
  );
}

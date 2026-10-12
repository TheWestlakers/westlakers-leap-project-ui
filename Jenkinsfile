pipeline {
    agent any

    tools {
        nodejs 'NodeJS'
    }

    options {
        timestamps()
    }

    environment {
        CI = 'true'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Node Tooling') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'node --version && npm --version && which node && which npm'
                    } else {
                        bat 'node --version && npm --version && where node && where npm'
                    }
                }
            }
        }

        stage('Install') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm ci'
                    } else {
                        bat 'npm ci'
                    }
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm run build'
                    } else {
                        bat 'npm run build'
                    }
                }
            }
        }

        stage('Test') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm run test -- --watch=false --no-progress'
                    } else {
                        bat 'npm run test -- --watch=false --no-progress'
                    }
                }
            }
        }
    }
}
